import type { FastifyRequest, FastifyReply } from 'fastify';

const TENET_API_TOKEN = process.env.TENET_API_TOKEN;

/**
 * Fastify preHandler hook that validates the Authorization: Bearer token
 * against the TENET_API_TOKEN environment variable.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!TENET_API_TOKEN) {
    reply.status(500).send({ error: 'Server misconfigured: TENET_API_TOKEN not set' });
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader) {
    reply.status(401).send({ error: 'Missing Authorization header' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    reply.status(401).send({ error: 'Invalid Authorization header format. Expected: Bearer <token>' });
    return;
  }

  if (parts[1] !== TENET_API_TOKEN) {
    reply.status(401).send({ error: 'Invalid API token' });
    return;
  }
}
