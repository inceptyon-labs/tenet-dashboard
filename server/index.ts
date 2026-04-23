import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { runMigrations } from './db/migrate.js';
import { db } from './db/client.js';
import { settings } from './db/schema.js';
import { scheduleRetention } from './jobs/retention.js';
import reportsRoutes from './routes/reports.js';
import projectsRoutes from './routes/projects.js';
import findingsRoutes from './routes/findings.js';
import trendsRoutes from './routes/trends.js';
import settingsRoutes from './routes/settings.js';
import authRoutes from './routes/auth.js';

const isProduction = process.env.NODE_ENV === 'production';

async function main(): Promise<void> {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // Serve static files in production
  if (isProduction) {
    const clientDist = path.resolve(process.cwd(), 'client/dist');
    await fastify.register(fastifyStatic, {
      root: clientDist,
      prefix: '/',
      wildcard: false,
    });
  }

  // Register route modules
  await fastify.register(authRoutes);
  await fastify.register(reportsRoutes);
  await fastify.register(projectsRoutes);
  await fastify.register(findingsRoutes);
  await fastify.register(trendsRoutes);
  await fastify.register(settingsRoutes);

  // SPA fallback for production: serve index.html for all non-API routes
  if (isProduction) {
    fastify.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.status(404).send({ error: 'Not found' });
      }
      const clientDist = path.resolve(process.cwd(), 'client/dist');
      return reply.sendFile('index.html', clientDist);
    });
  }

  // Run migrations
  try {
    await runMigrations();
    fastify.log.info('Database migrations applied');
  } catch (err) {
    fastify.log.error({ err }, 'Migration failed (continuing anyway)');
  }

  // Seed default settings if missing
  await seedDefaultSettings();

  // Start retention cron job
  const retentionTask = scheduleRetention();

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    retentionTask.stop();
    await fastify.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Listen
  const port = parseInt(process.env.PORT ?? '8787', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  await fastify.listen({ port, host });
  fastify.log.info(`Tenet dashboard server listening on ${host}:${port}`);
}

async function seedDefaultSettings(): Promise<void> {
  const defaults: Array<{ key: string; value: unknown }> = [
    {
      key: 'dimension_weights',
      value: {
        security: 1.5, secrets: 1.5, dependencies: 1.3, errors: 1.3,
        solid: 1.1, complexity: 1.1, debt: 1.1, testing: 1.1,
        performance: 1.0, api_contract: 1.0, observability: 1.0, build_ci: 1.0,
        docs: 0.8, accessibility: 0.8,
      },
    },
    {
      key: 'retention',
      value: {
        full_retention_days: 90,
        snapshot_retention_days: 730,
      },
    },
  ];

  for (const { key, value } of defaults) {
    const existing = await db
      .select({ key: settings.key })
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(settings).values({
        key,
        value: value as Record<string, unknown>,
      });
      console.log(`[seed] Inserted default setting: ${key}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
