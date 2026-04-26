/**
 * Shared TypeScript types for the Tenet dashboard application.
 */

// ── Dimension / Finding severity ──────────────────────────────

export type Severity = 'critical' | 'major' | 'minor' | 'info';
export type Confidence = 'deterministic' | 'native' | 'tree_sitter' | 'heuristic';
export type CheckStatus = 'passed' | 'failed' | 'skipped' | 'info';
export type Grade = 'A' | 'B' | 'C' | 'F';

export interface DimensionCheck {
  name: string;
  status: CheckStatus;
  description?: string;
  details?: string;
  count?: number | null;
  tool?: string;
}

// ── Ingest payload (mirrors Zod schemas) ──────────────────────

export interface IngestProject {
  slug: string;
  name: string;
  repo_url?: string | null;
  commit: string;
  branch: string;
}

export interface IngestRun {
  started_at: string;
  completed_at: string;
  orchestrator_version: string;
  dimensions_run: string[];
  toolchain_summary?: Record<string, unknown>;
  lines_of_code?: number;
  files_analyzed?: number;
}

export interface IngestDimension {
  key: string;
  score: number | null;
  weight: number;
  applicable: boolean;
  skill_version?: string;
  notes?: string;
  metrics?: Record<string, unknown>;
  checks?: DimensionCheck[];
}

export interface IngestFinding {
  dimension: string;
  severity: Severity;
  rule?: string;
  title: string;
  description?: string;
  file?: string | null;
  line?: number | null;
  column?: number | null;
  snippet?: string | null;
  fix_prompt: string;
  confidence?: Confidence;
}

export interface IngestPayload {
  project: IngestProject;
  run: IngestRun;
  dimensions: IngestDimension[];
  findings: IngestFinding[];
}

// ── API response shapes ───────────────────────────────────────

export interface IngestResponse {
  report_id: string;
  project_slug: string;
  composite_score: number;
  delta: ScoreDelta | null;
  dashboard_url: string;
}

export interface ProjectListItem {
  slug: string;
  name: string;
  repo_url: string | null;
  last_seen_at: string;
  latest_score: number | null;
  latest_commit: string | null;
  latest_branch: string | null;
  latest_delta: ScoreDelta | null;
  report_count: number;
}

export interface DimensionRow {
  id: string;
  key: string;
  score: number | null;
  weight: number;
  weighted: number;
  applicable: boolean;
  skill_version: string | null;
  notes: string | null;
  metrics: unknown;
  counts: unknown;
  checks: DimensionCheck[] | null;
}

export interface FindingRow {
  id: string;
  dimension_key: string;
  severity: Severity;
  rule: string | null;
  title: string;
  description: string | null;
  file: string | null;
  line: number | null;
  column: number | null;
  snippet: string | null;
  fix_prompt: string;
  confidence: string | null;
}

export interface ReportDetail {
  id: string;
  project_slug: string;
  project_name: string;
  commit: string;
  branch: string;
  started_at: string;
  completed_at: string;
  orchestrator_version: string;
  composite_score: number;
  lines_of_code: number | null;
  files_analyzed: number | null;
  toolchain_summary: unknown;
  created_at: string;
  dimensions: DimensionRow[];
  findings: FindingRow[];
  delta: ScoreDelta | null;
}

export interface ScoreDelta {
  composite: number;
  dimensions: Record<string, number>;
}

export interface MutationTrendPoint {
  available: boolean;
  provider: string | null;
  score_pct: number | null;
  rating: string | null;
  killed: number | null;
  survived: number | null;
  timed_out: number | null;
  total: number | null;
  scope: string | null;
  bonus_applied: number | null;
}

export interface ReportListItem {
  id: string;
  commit: string;
  branch: string;
  composite_score: number;
  started_at: string;
  completed_at: string;
  created_at: string;
}

export interface TrendDay {
  day: string;
  composite: number;
  dimensions: Record<string, number>;
  counts: Record<string, number>;
  mutation?: MutationTrendPoint | null;
}

export interface TrendResponse {
  days: TrendDay[];
}

// ── Settings ──────────────────────────────────────────────────

export interface RetentionSettings {
  full_retention_days: number;
  snapshot_retention_days: number;
}

export interface DimensionWeights {
  [key: string]: number;
}

export interface AppSettings {
  dimension_weights?: DimensionWeights;
  retention?: RetentionSettings;
  [key: string]: unknown;
}

// ── Retention job ─────────────────────────────────────────────

export interface RetentionSummary {
  snapshotsCreated: number;
  reportsRolledUp: number;
  reportsDeleted: number;
  snapshotsExpired: number;
}
