import crypto from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

const COOKIE_NAME = 'tenet_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function signingKey(): Buffer {
  const pw = process.env.DASHBOARD_PASSWORD;
  if (!pw) throw new Error('DASHBOARD_PASSWORD not set');
  return crypto.createHash('sha256').update(pw).digest();
}

export function signSessionCookie(): string {
  const issuedAt = String(Date.now());
  const hmac = crypto.createHmac('sha256', signingKey()).update(issuedAt).digest('hex');
  return `${issuedAt}.${hmac}`;
}

function verifySessionCookie(value: string): boolean {
  const dot = value.indexOf('.');
  if (dot < 0) return false;
  const issuedAt = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  let expected: string;
  try {
    expected = crypto.createHmac('sha256', signingKey()).update(issuedAt).digest('hex');
  } catch {
    return false;
  }
  const sigBuf = Buffer.from(sig, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;
  const ageMs = Date.now() - Number(issuedAt);
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= MAX_AGE_SECONDS * 1000;
}

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

export function hasValidSession(request: FastifyRequest): boolean {
  const cookie = readCookie(request.headers.cookie, COOKIE_NAME);
  if (!cookie) return false;
  return verifySessionCookie(cookie);
}

export function setSessionCookie(reply: FastifyReply, value: string): void {
  reply.header(
    'Set-Cookie',
    `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`,
  );
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.header('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function verifyPassword(provided: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (hasValidSession(request)) return;

  const token = process.env.TENET_API_TOKEN;
  const header = request.headers.authorization;
  if (token && header) {
    const parts = header.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const a = Buffer.from(parts[1]);
      const b = Buffer.from(token);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return;
    }
  }

  reply.status(401).send({ error: 'Unauthorized' });
}
