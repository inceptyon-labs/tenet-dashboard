import type { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { settings, reports, dimensions, findings, dailySnapshots, projects } from '../db/schema.js';
import { requireAuth } from '../lib/auth.js';
import { runRetention } from '../jobs/retention.js';
import { normalizeDimensionWeights } from '../lib/dimensions.js';

export default async function settingsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/settings
   * Returns all settings as a key-value object.
   */
  fastify.get('/api/v1/settings', async (_request, reply) => {
    const rows = await db.select().from(settings);

    const result: Record<string, unknown> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    result.dimension_weights = normalizeDimensionWeights(result.dimension_weights as Record<string, number> | undefined);

    return reply.send(result);
  });

  /**
   * PUT /api/v1/settings
   * Auth required. Partial merge update of settings.
   * Body is an object of key -> value pairs to upsert.
   */
  fastify.put('/api/v1/settings', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;

    if (!body || typeof body !== 'object') {
      return reply.status(400).send({ error: 'Body must be a JSON object' });
    }

    for (const [key, rawValue] of Object.entries(body)) {
      const value = key === 'dimension_weights'
        ? normalizeDimensionWeights(rawValue as Record<string, number>)
        : rawValue;

      await db
        .insert(settings)
        .values({
          key,
          value: value as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: value as Record<string, unknown>,
            updatedAt: new Date(),
          },
        });
    }

    // Return updated settings
    const rows = await db.select().from(settings);
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    result.dimension_weights = normalizeDimensionWeights(result.dimension_weights as Record<string, number> | undefined);

    return reply.send(result);
  });

  /**
   * POST /api/v1/admin/rollup-now
   * Auth required. Triggers retention job immediately.
   */
  fastify.post('/api/v1/admin/rollup-now', { preHandler: [requireAuth] }, async (_request, reply) => {
    const summary = await runRetention();
    return reply.send({ ok: true, summary });
  });

  /**
   * POST /api/v1/admin/delete-expired
   * Auth required. Deletes rolled-up reports that have been processed.
   */
  fastify.post('/api/v1/admin/delete-expired', { preHandler: [requireAuth] }, async (_request, reply) => {
    const result = await db
      .delete(reports)
      .where(eq(reports.rolledUp, true))
      .returning({ id: reports.id });

    return reply.send({
      ok: true,
      deleted: result.length,
    });
  });

  /**
   * POST /api/v1/admin/wipe-all
   * Auth required. Requires body { "confirm": "WIPE_ALL_REPORTS" }.
   * Truncates all tables except settings.
   */
  fastify.post('/api/v1/admin/wipe-all', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as { confirm?: string };

    if (body?.confirm !== 'WIPE_ALL_REPORTS') {
      return reply.status(400).send({
        error: 'Confirmation required. Send { "confirm": "WIPE_ALL_REPORTS" }',
      });
    }

    // Delete in dependency order (findings/dimensions depend on reports, reports/snapshots depend on projects)
    await db.execute(sql`TRUNCATE findings, dimensions, reports, daily_snapshots, projects CASCADE`);

    return reply.send({ ok: true, message: 'All report data wiped. Settings preserved.' });
  });
}
