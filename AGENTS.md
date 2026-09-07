# tenet-dashboard — agent notes

## Invariants

- **Schema changes go through `sql/init.sql`, not Drizzle migrations.** There
  is no `server/db/migrations/` — `npm run db:migrate` just runs
  `sql/init.sql` verbatim against `DATABASE_URL` (`server/db/migrate.ts`).
  Add new columns as idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in
  `sql/init.sql`, and hand-update the matching `pgTable` in
  `server/db/schema.ts` to match — Drizzle's schema is for typed queries
  only, it does not generate or apply migrations here despite `drizzle-kit`
  being present.
- **Resolve runtime paths from `process.cwd()`, never `__dirname`**
  (`server/index.ts`, `server/db/migrate.ts`) — the compiled server in
  `dist/server/` and the source under `server/` sit at different depths, so
  `__dirname`-based paths to `client/dist` or `sql/init.sql` broke in
  production before this fix.
- Read endpoints (`GET /api/v1/*`) are intentionally unauthenticated; only
  writes and `/api/v1/admin/*` require the bearer token or session cookie.
  This is a deliberate self-hosted/LAN-only design (see README's Auth
  table), not an oversight — don't add auth to a read route without asking.

## Workflows

- Deploy is `uranus-deploy`-pattern: build-from-source `docker-compose.yml`
  pushed to Uranus via `deploy`, triggered by `/acp` on `main` (`.deploy`
  marker). No registry, no GitHub Actions.
- `client/dist` must exist before `docker compose up --build` will serve a
  UI — the Dockerfile builds it, but local `npm run dev` (API) and
  `npm run dev:client` (Vite) run as two separate processes against
  different ports (`:8787` / `:5173`), with Vite proxying `/api`.
