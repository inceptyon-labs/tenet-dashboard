import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

export async function runMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sqlPath = path.resolve(process.cwd(), 'sql/init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    await client.query(sql);
    console.log('[migrate] init.sql applied successfully');
  } finally {
    await client.end();
  }
}

// When run directly as a script: tsx server/db/migrate.ts
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('server/db/migrate.ts');

if (isMainModule) {
  runMigrations()
    .then(() => {
      console.log('[migrate] Done');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[migrate] Failed:', err);
      process.exit(1);
    });
}
