import type { FastifyInstance } from 'fastify';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { projects, reports, dimensions, findings, settings } from '../db/schema.js';
import { requireAuth } from '../lib/auth.js';
import { reportSchema } from '../lib/schema-validation.js';
import { computeComposite, computeWeightedContribution } from '../lib/scoring.js';
import type { DimensionWeights, ScoreDelta } from '../types.js';

export default async function reportsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/api/v1/reports', { preHandler: [requireAuth] }, async (request, reply) => {
    // 1. Parse and validate body
    const parsed = reportSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const payload = parsed.data;

    // 2. Get dimension_weights from settings table
    const weightRow = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, 'dimension_weights'))
      .limit(1);

    const weightOverrides: DimensionWeights =
      weightRow.length > 0 ? (weightRow[0].value as DimensionWeights) : {};

    // 3. Compute composite score
    const compositeScore = computeComposite(
      payload.dimensions.map((d) => ({
        score: d.score,
        applicable: d.applicable,
        key: d.key,
      })),
      weightOverrides,
    );

    // 4. Upsert project (insert on conflict update lastSeenAt and name)
    const upsertedProject = await db
      .insert(projects)
      .values({
        slug: payload.project.slug,
        name: payload.project.name,
        repoUrl: payload.project.repo_url ?? null,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: projects.slug,
        set: {
          name: payload.project.name,
          repoUrl: payload.project.repo_url ?? null,
          lastSeenAt: new Date(),
        },
      })
      .returning({ id: projects.id });

    const projectId = upsertedProject[0].id;

    // 5. Insert report
    const insertedReport = await db
      .insert(reports)
      .values({
        projectId,
        commit: payload.project.commit,
        branch: payload.project.branch,
        startedAt: new Date(payload.run.started_at),
        completedAt: new Date(payload.run.completed_at),
        orchestratorVersion: payload.run.orchestrator_version,
        compositeScore,
        linesOfCode: payload.run.lines_of_code ?? null,
        filesAnalyzed: payload.run.files_analyzed ?? null,
        toolchainSummary: payload.run.toolchain_summary ?? null,
      })
      .returning({ id: reports.id });

    const reportId = insertedReport[0].id;

    // 6. Compute total weight for weighted contribution
    const applicableDims = payload.dimensions.filter(
      (d) => d.applicable && d.score !== null,
    );
    let totalWeight = 0;
    for (const d of applicableDims) {
      totalWeight += weightOverrides[d.key] ?? d.weight;
    }

    // Insert dimensions with computed weighted values
    if (payload.dimensions.length > 0) {
      await db.insert(dimensions).values(
        payload.dimensions.map((d) => {
          const effectiveWeight = weightOverrides[d.key] ?? d.weight;
          const weighted =
            d.applicable && d.score !== null
              ? computeWeightedContribution(d.score, effectiveWeight, totalWeight)
              : 0;

          // Compute counts from findings for this dimension
          const dimFindings = payload.findings.filter((f) => f.dimension === d.key);
          const counts: Record<string, number> = {};
          for (const f of dimFindings) {
            counts[f.severity] = (counts[f.severity] ?? 0) + 1;
          }

          return {
            reportId,
            key: d.key,
            score: d.score,
            weight: effectiveWeight,
            weighted,
            applicable: d.applicable,
            skillVersion: d.skill_version ?? null,
            notes: d.notes ?? null,
            metrics: d.metrics ?? null,
            counts: Object.keys(counts).length > 0 ? counts : null,
          };
        }),
      );
    }

    // 7. Insert findings
    if (payload.findings.length > 0) {
      await db.insert(findings).values(
        payload.findings.map((f) => ({
          reportId,
          dimensionKey: f.dimension,
          severity: f.severity,
          rule: f.rule ?? null,
          title: f.title,
          description: f.description ?? null,
          file: f.file ?? null,
          line: f.line ?? null,
          column: f.column ?? null,
          snippet: f.snippet ?? null,
          fixPrompt: f.fix_prompt,
          confidence: f.confidence ?? null,
        })),
      );
    }

    // 8. Compute delta from previous report if exists
    let delta: ScoreDelta | null = null;

    const previousReports = await db
      .select({
        id: reports.id,
        compositeScore: reports.compositeScore,
      })
      .from(reports)
      .where(eq(reports.projectId, projectId))
      .orderBy(desc(reports.createdAt))
      .limit(2);

    // previousReports[0] is the report we just inserted, [1] is the previous one
    if (previousReports.length >= 2) {
      const prevReportId = previousReports[1].id;
      const prevComposite = previousReports[1].compositeScore;

      const prevDims = await db
        .select({ key: dimensions.key, score: dimensions.score })
        .from(dimensions)
        .where(eq(dimensions.reportId, prevReportId));

      const dimDeltas: Record<string, number> = {};
      for (const d of payload.dimensions) {
        const prevDim = prevDims.find((pd) => pd.key === d.key);
        if (prevDim && prevDim.score !== null && d.score !== null) {
          dimDeltas[d.key] = d.score - prevDim.score;
        }
      }

      delta = {
        composite: compositeScore - prevComposite,
        dimensions: dimDeltas,
      };
    }

    // 9. Return response
    return reply.status(201).send({
      report_id: reportId,
      project_slug: payload.project.slug,
      composite_score: compositeScore,
      delta,
      dashboard_url: `/projects/${payload.project.slug}`,
    });
  });
}
