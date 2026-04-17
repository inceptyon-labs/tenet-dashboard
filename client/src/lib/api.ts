const BASE = '/api/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? body.message ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/* ---------- Types matching server responses ---------- */

export interface ProjectSummary {
  slug: string;
  name: string;
  repo_url: string | null;
  last_seen_at: string;
  latest_score: number | null;
  latest_commit: string | null;
  latest_branch: string | null;
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
  counts: Record<string, number> | null;
}

export interface FindingRow {
  id: string;
  dimension_key: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
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

export interface ScoreDelta {
  composite: number;
  dimensions: Record<string, number>;
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
  toolchain_summary: Record<string, string> | null;
  created_at: string;
  dimensions: DimensionRow[];
  findings: FindingRow[];
  delta: ScoreDelta | null;
}

export interface TrendDay {
  day: string;
  composite: number;
  dimensions: Record<string, number>;
  counts: Record<string, number>;
}

export interface TrendResponse {
  days: TrendDay[];
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

export interface PaginatedReports {
  items: ReportListItem[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/* ---------- API functions ---------- */

export function fetchProjects(): Promise<ProjectSummary[]> {
  return request<ProjectSummary[]>('/projects');
}

export function fetchProject(slug: string, reportId?: string): Promise<ReportDetail> {
  const query = reportId ? `?report_id=${reportId}` : '';
  return request<ReportDetail>(`/projects/${slug}${query}`);
}

export function fetchFinding(id: string): Promise<FindingRow> {
  return request<FindingRow>(`/findings/${id}`);
}

export function fetchTrends(slug: string): Promise<TrendResponse> {
  return request<TrendResponse>(`/projects/${slug}/trends`);
}

export function fetchSettings(): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>('/settings');
}

export function updateSettings(partial: Record<string, unknown>): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>('/settings', {
    method: 'PUT',
    body: JSON.stringify(partial),
  });
}

export function adminRollup(): Promise<{ ok: boolean; summary: unknown }> {
  return request('/admin/rollup-now', { method: 'POST' });
}

export function adminDeleteExpired(): Promise<{ ok: boolean; deleted: number }> {
  return request('/admin/delete-expired', { method: 'POST' });
}

export function adminWipeAll(): Promise<{ ok: boolean; message: string }> {
  return request('/admin/wipe-all', {
    method: 'POST',
    body: JSON.stringify({ confirm: 'WIPE_ALL_REPORTS' }),
  });
}

export function fetchProjectReports(slug: string, page = 1, limit = 25): Promise<PaginatedReports> {
  return request<PaginatedReports>(`/projects/${slug}/reports?page=${page}&limit=${limit}`);
}
