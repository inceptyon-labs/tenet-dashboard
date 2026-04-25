import type { FastifyInstance } from 'fastify';
import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { projects, reports, dimensions, findings } from '../db/schema.js';
import type { ScoreDelta, DimensionRow, FindingRow, ProjectListItem, ReportListItem } from '../types.js';

export default async function projectsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/projects
   * List projects with latest score, commit, branch, last_seen_at, report_count.
   */
  fastify.get('/api/v1/projects', async (_request, reply) => {
    const rows = await db
      .select({
        slug: projects.slug,
        name: projects.name,
        repoUrl: projects.repoUrl,
        lastSeenAt: projects.lastSeenAt,
      })
      .from(projects)
      .orderBy(desc(projects.lastSeenAt));

    const result: ProjectListItem[] = [];

    for (const row of rows) {
      // Get latest report for this project
      const latestReport = await db
        .select({
          id: reports.id,
          compositeScore: reports.compositeScore,
          commit: reports.commit,
          branch: reports.branch,
          createdAt: reports.createdAt,
        })
        .from(reports)
        .innerJoin(projects, eq(reports.projectId, projects.id))
        .where(eq(projects.slug, row.slug))
        .orderBy(desc(reports.createdAt))
        .limit(1);

      // Get report count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(reports)
        .innerJoin(projects, eq(reports.projectId, projects.id))
        .where(eq(projects.slug, row.slug));

      let latestDelta: ScoreDelta | null = null;

      if (latestReport.length > 0) {
        const latest = latestReport[0];
        const previousReports = await db
          .select({ id: reports.id, compositeScore: reports.compositeScore })
          .from(reports)
          .innerJoin(projects, eq(reports.projectId, projects.id))
          .where(
            and(
              eq(projects.slug, row.slug),
              sql`${reports.createdAt} < ${latest.createdAt}`,
            ),
          )
          .orderBy(desc(reports.createdAt))
          .limit(1);

        if (previousReports.length > 0) {
          const previous = previousReports[0];
          const [latestDims, previousDims] = await Promise.all([
            db
              .select({ key: dimensions.key, score: dimensions.score })
              .from(dimensions)
              .where(eq(dimensions.reportId, latest.id)),
            db
              .select({ key: dimensions.key, score: dimensions.score })
              .from(dimensions)
              .where(eq(dimensions.reportId, previous.id)),
          ]);

          const dimensionDeltas: Record<string, number> = {};
          for (const dim of latestDims) {
            const previousDim = previousDims.find((pd) => pd.key === dim.key);
            if (previousDim && previousDim.score !== null && dim.score !== null) {
              dimensionDeltas[dim.key] = dim.score - previousDim.score;
            }
          }

          latestDelta = {
            composite: latest.compositeScore - previous.compositeScore,
            dimensions: dimensionDeltas,
          };
        }
      }

      result.push({
        slug: row.slug,
        name: row.name,
        repo_url: row.repoUrl,
        last_seen_at: row.lastSeenAt.toISOString(),
        latest_score: latestReport.length > 0 ? latestReport[0].compositeScore : null,
        latest_commit: latestReport.length > 0 ? latestReport[0].commit : null,
        latest_branch: latestReport.length > 0 ? latestReport[0].branch : null,
        latest_delta: latestDelta,
        report_count: countResult[0].count,
      });
    }

    return reply.send(result);
  });

  /**
   * GET /api/v1/projects/:slug
   * Returns latest report fully expanded with dimensions, findings, and delta.
   * Supports ?report_id= query param for historical report.
   */
  fastify.get<{
    Params: { slug: string };
    Querystring: { report_id?: string };
  }>('/api/v1/projects/:slug', async (request, reply) => {
    const { slug } = request.params;
    const { report_id } = request.query as { report_id?: string };

    // Find the project
    const projectRows = await db
      .select()
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);

    if (projectRows.length === 0) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const project = projectRows[0];

    // Find the target report
    let reportRow;
    if (report_id) {
      const rows = await db
        .select()
        .from(reports)
        .where(and(eq(reports.id, report_id), eq(reports.projectId, project.id)))
        .limit(1);
      reportRow = rows[0];
    } else {
      const rows = await db
        .select()
        .from(reports)
        .where(eq(reports.projectId, project.id))
        .orderBy(desc(reports.createdAt))
        .limit(1);
      reportRow = rows[0];
    }

    if (!reportRow) {
      return reply.status(404).send({ error: 'Report not found' });
    }

    // Get dimensions
    const dimRows = await db
      .select()
      .from(dimensions)
      .where(eq(dimensions.reportId, reportRow.id));

    const dimensionResult: DimensionRow[] = dimRows.map((d) => ({
      id: d.id,
      key: d.key,
      score: d.score,
      weight: d.weight,
      weighted: d.weighted,
      applicable: d.applicable,
      skill_version: d.skillVersion,
      notes: d.notes,
      metrics: d.metrics,
      counts: d.counts,
    }));

    // Get findings
    const findingRows = await db
      .select()
      .from(findings)
      .where(eq(findings.reportId, reportRow.id));

    const findingResult: FindingRow[] = findingRows.map((f) => ({
      id: f.id,
      dimension_key: f.dimensionKey,
      severity: f.severity as FindingRow['severity'],
      rule: f.rule,
      title: f.title,
      description: f.description,
      file: f.file,
      line: f.line,
      column: f.column,
      snippet: f.snippet,
      fix_prompt: f.fixPrompt,
      confidence: f.confidence,
    }));

    // Compute delta from previous report
    let delta: ScoreDelta | null = null;

    const previousReports = await db
      .select({ id: reports.id, compositeScore: reports.compositeScore })
      .from(reports)
      .where(
        and(
          eq(reports.projectId, project.id),
          sql`${reports.createdAt} < ${reportRow.createdAt}`,
        ),
      )
      .orderBy(desc(reports.createdAt))
      .limit(1);

    if (previousReports.length > 0) {
      const prevReport = previousReports[0];
      const prevDims = await db
        .select({ key: dimensions.key, score: dimensions.score })
        .from(dimensions)
        .where(eq(dimensions.reportId, prevReport.id));

      const dimDeltas: Record<string, number> = {};
      for (const d of dimensionResult) {
        const prevDim = prevDims.find((pd) => pd.key === d.key);
        if (prevDim && prevDim.score !== null && d.score !== null) {
          dimDeltas[d.key] = d.score - prevDim.score;
        }
      }

      delta = {
        composite: reportRow.compositeScore - prevReport.compositeScore,
        dimensions: dimDeltas,
      };
    }

    return reply.send({
      id: reportRow.id,
      project_slug: project.slug,
      project_name: project.name,
      commit: reportRow.commit,
      branch: reportRow.branch,
      started_at: reportRow.startedAt.toISOString(),
      completed_at: reportRow.completedAt.toISOString(),
      orchestrator_version: reportRow.orchestratorVersion,
      composite_score: reportRow.compositeScore,
      lines_of_code: reportRow.linesOfCode,
      files_analyzed: reportRow.filesAnalyzed,
      toolchain_summary: reportRow.toolchainSummary,
      created_at: reportRow.createdAt.toISOString(),
      dimensions: dimensionResult,
      findings: findingResult,
      delta,
    });
  });

  /**
   * GET /api/v1/projects/:slug/reports
   * Paginated report history (metadata only).
   */
  fastify.get<{
    Params: { slug: string };
    Querystring: { page?: string; limit?: string };
  }>('/api/v1/projects/:slug/reports', async (request, reply) => {
    const { slug } = request.params;
    const query = request.query as { page?: string; limit?: string };
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '25', 10)));
    const offset = (page - 1) * limit;

    // Find the project
    const projectRows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);

    if (projectRows.length === 0) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const projectId = projectRows[0].id;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reports)
      .where(eq(reports.projectId, projectId));

    const total = countResult[0].count;

    // Get paginated reports
    const rows = await db
      .select({
        id: reports.id,
        commit: reports.commit,
        branch: reports.branch,
        compositeScore: reports.compositeScore,
        startedAt: reports.startedAt,
        completedAt: reports.completedAt,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(eq(reports.projectId, projectId))
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset);

    const items: ReportListItem[] = rows.map((r) => ({
      id: r.id,
      commit: r.commit,
      branch: r.branch,
      composite_score: r.compositeScore,
      started_at: r.startedAt.toISOString(),
      completed_at: r.completedAt.toISOString(),
      created_at: r.createdAt.toISOString(),
    }));

    return reply.send({
      items,
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    });
  });
}
