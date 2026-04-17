import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { findings } from '../db/schema.js';

export default async function findingsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/findings/:id
   * Returns a single finding with the full fix_prompt.
   */
  fastify.get<{ Params: { id: string } }>('/api/v1/findings/:id', async (request, reply) => {
    const { id } = request.params;

    const rows = await db
      .select()
      .from(findings)
      .where(eq(findings.id, id))
      .limit(1);

    if (rows.length === 0) {
      return reply.status(404).send({ error: 'Finding not found' });
    }

    const f = rows[0];

    return reply.send({
      id: f.id,
      report_id: f.reportId,
      dimension_key: f.dimensionKey,
      severity: f.severity,
      rule: f.rule,
      title: f.title,
      description: f.description,
      file: f.file,
      line: f.line,
      column: f.column,
      snippet: f.snippet,
      fix_prompt: f.fixPrompt,
      confidence: f.confidence,
    });
  });
}
