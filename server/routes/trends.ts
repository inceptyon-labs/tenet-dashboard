import type { FastifyInstance } from 'fastify';
import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { projects, reports, dimensions, dailySnapshots } from '../db/schema.js';
import type { MutationTrendPoint, TrendDay } from '../types.js';

export default async function trendsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/projects/:slug/trends
   * Returns composite + dimension scores over time.
   * Merges recent reports with older daily_snapshots.
   */
  fastify.get<{
    Params: { slug: string };
    Querystring: { days?: string };
  }>('/api/v1/projects/:slug/trends', async (request, reply) => {
    const { slug } = request.params;
    const query = request.query as { days?: string };
    const maxDays = Math.min(365, Math.max(1, parseInt(query.days ?? '90', 10)));

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
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxDays);

    // Collect from daily_snapshots (older, aggregated data)
    const snapshots = await db
      .select()
      .from(dailySnapshots)
      .where(
        and(
          eq(dailySnapshots.projectId, projectId),
          sql`${dailySnapshots.day} >= ${cutoff.toISOString().slice(0, 10)}`,
        ),
      )
      .orderBy(dailySnapshots.day);

    // Collect from recent reports (not rolled up)
    const recentReports = await db
      .select({
        id: reports.id,
        compositeScore: reports.compositeScore,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(
        and(
          eq(reports.projectId, projectId),
          sql`${reports.createdAt} >= ${cutoff}`,
          eq(reports.rolledUp, false),
        ),
      )
      .orderBy(reports.createdAt);

    // Build a map of day -> TrendDay, snapshots first then reports override
    const dayMap = new Map<string, TrendDay>();

    // Add snapshots
    for (const snap of snapshots) {
      dayMap.set(snap.day, {
        day: snap.day,
        composite: snap.compositeScore,
        dimensions: (snap.dimensionScores ?? {}) as Record<string, number>,
        counts: (snap.findingCounts ?? {}) as Record<string, number>,
        mutation: null,
      });
    }

    // Add recent reports, grouped by day (take last report of each day)
    for (const report of recentReports) {
      const day = report.createdAt.toISOString().slice(0, 10);

      // Get dimensions for this report
      const dimRows = await db
        .select({ key: dimensions.key, score: dimensions.score, counts: dimensions.counts, metrics: dimensions.metrics })
        .from(dimensions)
        .where(eq(dimensions.reportId, report.id));

      const dimScores: Record<string, number> = {};
      const counts: Record<string, number> = {};
      let mutation: MutationTrendPoint | null = null;

      for (const d of dimRows) {
        if (d.score !== null) {
          dimScores[d.key] = d.score;
        }
        if (d.key === 'testing') {
          mutation = extractMutationTrend(d.metrics);
        }
        if (d.counts && typeof d.counts === 'object') {
          const c = d.counts as Record<string, number>;
          for (const [severity, count] of Object.entries(c)) {
            counts[severity] = (counts[severity] ?? 0) + count;
          }
        }
      }

      // Last report of the day wins
      dayMap.set(day, {
        day,
        composite: report.compositeScore,
        dimensions: dimScores,
        counts,
        mutation,
      });
    }

    // Sort by day ascending
    const days = Array.from(dayMap.values()).sort((a, b) => a.day.localeCompare(b.day));

    return reply.send({ days });
  });
}

function extractMutationTrend(metrics: unknown): MutationTrendPoint | null {
  if (!isPlainObject(metrics)) return null;

  const available = metrics.mutation_available === true;
  const scorePct = readNumber(metrics.mutation_score_pct);
  const total = readNumber(metrics.mutation_mutants_total);
  const killed = readNumber(metrics.mutation_mutants_killed);
  const survived = readNumber(metrics.mutation_mutants_survived);
  const timedOut = readNumber(metrics.mutation_mutants_timed_out);

  if (!available && scorePct === null && total === null && killed === null && survived === null && timedOut === null) {
    return null;
  }

  return {
    available,
    provider: readString(metrics.mutation_provider),
    score_pct: scorePct,
    rating: readString(metrics.mutation_rating),
    killed,
    survived,
    timed_out: timedOut,
    total,
    scope: readString(metrics.mutation_scope),
    bonus_applied: readNumber(metrics.mutation_bonus_applied),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}
