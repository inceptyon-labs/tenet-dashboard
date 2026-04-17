-- Tenet Dashboard - Idempotent schema initialization
-- Run with: psql $DATABASE_URL -f sql/init.sql
-- Or via: npm run db:migrate

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Projects ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       VARCHAR(128) NOT NULL UNIQUE,
  name       VARCHAR(256) NOT NULL,
  repo_url   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Reports ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  commit                VARCHAR(64) NOT NULL,
  branch                VARCHAR(256) NOT NULL,
  started_at            TIMESTAMPTZ NOT NULL,
  completed_at          TIMESTAMPTZ NOT NULL,
  orchestrator_version  VARCHAR(32) NOT NULL,
  composite_score       INTEGER NOT NULL,
  lines_of_code         INTEGER,
  files_analyzed        INTEGER,
  toolchain_summary     JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  rolled_up             BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS reports_project_idx ON reports (project_id, created_at);
CREATE INDEX IF NOT EXISTS reports_created_idx ON reports (created_at);

-- ── Dimensions ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dimensions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  key           VARCHAR(64) NOT NULL,
  score         INTEGER,
  weight        REAL NOT NULL,
  weighted      REAL NOT NULL,
  applicable    BOOLEAN NOT NULL DEFAULT true,
  skill_version VARCHAR(32),
  notes         TEXT,
  metrics       JSONB,
  counts        JSONB
);

CREATE INDEX IF NOT EXISTS dimensions_report_idx ON dimensions (report_id);

-- ── Findings ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS findings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id      UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  dimension_key  VARCHAR(64) NOT NULL,
  severity       VARCHAR(16) NOT NULL,
  rule           VARCHAR(128),
  title          VARCHAR(512) NOT NULL,
  description    TEXT,
  file           TEXT,
  line           INTEGER,
  "column"       INTEGER,
  snippet        TEXT,
  fix_prompt     TEXT NOT NULL,
  confidence     VARCHAR(16)
);

CREATE INDEX IF NOT EXISTS findings_report_idx ON findings (report_id, severity);
CREATE INDEX IF NOT EXISTS findings_dimension_idx ON findings (report_id, dimension_key);

-- ── Daily Snapshots ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  day              VARCHAR(10) NOT NULL,
  composite_score  INTEGER NOT NULL,
  dimension_scores JSONB NOT NULL,
  finding_counts   JSONB NOT NULL,
  report_count     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS snapshots_project_day_idx ON daily_snapshots (project_id, day);

-- ── Settings ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS settings (
  key        VARCHAR(64) PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Seed default settings ─────────────────────────────────────

INSERT INTO settings (key, value)
VALUES ('dimension_weights', '{"security": 1.5, "secrets": 1.5, "dependencies": 1.3, "errors": 1.3, "solid": 1.1, "complexity": 1.1, "debt": 1.1, "testing": 1.1, "performance": 1.0, "api_contract": 1.0, "observability": 1.0, "build_ci": 1.0, "docs": 0.8, "accessibility": 0.8}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value)
VALUES ('retention', '{"full_retention_days": 90, "snapshot_retention_days": 730}'::jsonb)
ON CONFLICT (key) DO NOTHING;
