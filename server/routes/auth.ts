import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  clearSessionCookie,
  hasValidSession,
  setSessionCookie,
  signSessionCookie,
  verifyPassword,
} from '../lib/auth.js';

const loginSchema = z.object({ password: z.string().min(1) });

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/api/v1/auth/login', async (request, reply) => {
    if (!process.env.DASHBOARD_PASSWORD) {
      return reply
        .status(500)
        .send({ error: 'Server misconfigured: DASHBOARD_PASSWORD not set' });
    }
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body' });
    }
    if (!verifyPassword(parsed.data.password)) {
      return reply.status(401).send({ error: 'Invalid password' });
    }
    setSessionCookie(reply, signSessionCookie());
    return { ok: true };
  });

  fastify.post('/api/v1/auth/logout', async (_request, reply) => {
    clearSessionCookie(reply);
    return { ok: true };
  });

  fastify.get('/api/v1/auth/me', async (request, reply) => {
    if (!hasValidSession(request)) {
      return reply.status(401).send({ authed: false });
    }
    return { authed: true };
  });
}
