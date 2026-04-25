interface BadgeKVNamespace {
  get<T = unknown>(key: string, type: 'json'): Promise<T | null>;
  put(key: string, value: string): Promise<void>;
}

interface Env {
  TENET_BADGES: BadgeKVNamespace;
  BADGE_WRITE_TOKEN: string;
  DASHBOARD_BASE_URL?: string;
  TENET_PROJECT_URL?: string;
}

interface BadgePayload {
  project_slug?: unknown;
  slug?: unknown;
  repo?: unknown;
  project_name?: unknown;
  score?: unknown;
  branch?: unknown;
  commit?: unknown;
  dashboard_url?: unknown;
  label?: unknown;
  updated_at?: unknown;
}

interface BadgeRecord {
  slug: string;
  projectName?: string;
  score: number;
  branch: string;
  commit?: string;
  dashboardUrl?: string;
  label: string;
  updatedAt: string;
}

interface BadgeRequest {
  slug: string;
  branch?: string;
  format: 'svg' | 'shields';
}

const DEFAULT_BRANCH = 'main';
const DEFAULT_LABEL = 'tenet';
const DEFAULT_TENET_PROJECT_URL = 'https://github.com/inceptyon-labs/tenet-skills';
const CACHE_SECONDS = 300;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/healthz') {
      return json({ ok: true }, 200, 60);
    }

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/about')) {
      return renderAboutPage(env);
    }

    if (request.method === 'GET' && url.pathname.startsWith('/projects/')) {
      return renderProjectPage(url, env);
    }

    if ((request.method === 'POST' || request.method === 'PUT') && isPublishPath(url.pathname)) {
      return publishBadge(request, env);
    }

    if (request.method === 'GET') {
      const badgeRequest = parseBadgeRequest(url);
      if (badgeRequest) return renderBadge(badgeRequest, env);
    }

    return json({ error: 'Not found' }, 404, 60);
  },
};

async function publishBadge(request: Request, env: Env): Promise<Response> {
  if (!isAuthorized(request, env)) {
    return json({ error: 'Unauthorized' }, 401, 0);
  }

  let body: BadgePayload;
  try {
    body = (await request.json()) as BadgePayload;
  } catch {
    return json({ error: 'Body must be JSON' }, 400, 0);
  }

  const slug = readString(body.project_slug) ?? readString(body.slug) ?? readString(body.repo);
  if (!slug) return json({ error: 'project_slug is required' }, 400, 0);

  const rawScore = typeof body.score === 'number' ? body.score : Number(body.score);
  if (!Number.isFinite(rawScore)) return json({ error: 'score must be a number' }, 400, 0);

  const branch = readString(body.branch) ?? DEFAULT_BRANCH;
  const record: BadgeRecord = {
    slug,
    projectName: readString(body.project_name),
    score: Math.max(0, Math.min(100, Math.round(rawScore))),
    branch,
    commit: readString(body.commit),
    dashboardUrl: normalizeDashboardUrl(readString(body.dashboard_url), slug, env),
    label: readString(body.label) ?? DEFAULT_LABEL,
    updatedAt: readString(body.updated_at) ?? new Date().toISOString(),
  };

  await env.TENET_BADGES.put(branchKey(slug, branch), JSON.stringify(record));
  await env.TENET_BADGES.put(latestKey(slug), JSON.stringify(record));

  return json(
    {
      ok: true,
      slug,
      branch,
      badge_svg: new URL(`/api/v1/badges/${encodeSlug(slug)}.svg`, request.url).toString(),
      shields_json: new URL(`/api/v1/badges/${encodeSlug(slug)}/shields.json`, request.url).toString(),
      info_url: new URL(`/projects/${encodeSlug(slug)}`, request.url).toString(),
    },
    200,
    0,
  );
}

async function renderProjectPage(url: URL, env: Env): Promise<Response> {
  const slug = decodeSlug(url.pathname.slice('/projects/'.length));
  if (!slug) return renderAboutPage(env);

  const record = await findBadgeRecord(env, slug, readString(url.searchParams.get('branch')));
  const tenetUrl = readString(env.TENET_PROJECT_URL) ?? DEFAULT_TENET_PROJECT_URL;
  const badgeUrl = new URL(`/api/v1/badges/${encodeSlug(slug)}.svg`, url).toString();
  const title = record?.projectName ?? slug;
  const score = record ? `${record.score}/100` : 'unknown';
  const updated = record ? new Date(record.updatedAt).toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC' : 'No score has been published yet.';

  return html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeXml(title)} Tenet Score</title>
  <style>${pageStyles()}</style>
</head>
<body>
  <main>
    <p class="eyebrow">Tenet score</p>
    <h1>${escapeXml(title)}</h1>
    <img src="${escapeXml(badgeUrl)}" alt="Tenet score ${escapeXml(score)}">
    <dl>
      <div><dt>Score</dt><dd>${escapeXml(score)}</dd></div>
      <div><dt>Branch</dt><dd>${escapeXml(record?.branch ?? DEFAULT_BRANCH)}</dd></div>
      <div><dt>Commit</dt><dd>${escapeXml(record?.commit?.slice(0, 12) ?? 'unknown')}</dd></div>
      <div><dt>Updated</dt><dd>${escapeXml(updated)}</dd></div>
    </dl>
    <p>Tenet is an automated code health audit that scores repositories across security, testing, maintainability, dependencies, operations, and other engineering quality dimensions.</p>
    <p class="actions">
      <a href="${escapeXml(tenetUrl)}">Learn about Tenet</a>
      ${record?.dashboardUrl ? `<a href="${escapeXml(record.dashboardUrl)}">Open dashboard</a>` : ''}
    </p>
  </main>
</body>
</html>`, record ? CACHE_SECONDS : 60);
}

function renderAboutPage(env: Env): Response {
  const tenetUrl = readString(env.TENET_PROJECT_URL) ?? DEFAULT_TENET_PROJECT_URL;
  return html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tenet Code Health Badges</title>
  <style>${pageStyles()}</style>
</head>
<body>
  <main>
    <p class="eyebrow">Tenet badges</p>
    <h1>Public code health scores for Tenet-audited repositories.</h1>
    <p>Tenet is an automated code health audit that scores repositories across security, testing, maintainability, dependencies, operations, and other engineering quality dimensions.</p>
    <p>README badges show the latest published composite score while keeping the full dashboard private unless the owner chooses to expose it.</p>
    <p class="actions"><a href="${escapeXml(tenetUrl)}">Learn about Tenet</a></p>
  </main>
</body>
</html>`, CACHE_SECONDS);
}

async function renderBadge(badgeRequest: BadgeRequest, env: Env): Promise<Response> {
  const record = await findBadgeRecord(env, badgeRequest.slug, badgeRequest.branch);

  if (badgeRequest.format === 'shields') {
    const status = badgeStatus(record);
    return json(
      {
        schemaVersion: 1,
        label: status.label,
        message: status.message,
        color: status.shieldsColor,
      },
      200,
      record ? CACHE_SECONDS : 60,
    );
  }

  const svg = renderSvg(badgeStatus(record));
  return new Response(svg, {
    status: 200,
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': `public, max-age=${record ? CACHE_SECONDS : 60}`,
    },
  });
}

async function findBadgeRecord(
  env: Env,
  slug: string,
  branch?: string,
): Promise<BadgeRecord | null> {
  const preferredBranch = branch ?? DEFAULT_BRANCH;
  const branchRecord = await env.TENET_BADGES.get<BadgeRecord>(branchKey(slug, preferredBranch), 'json');
  if (branchRecord || branch) return branchRecord;
  return env.TENET_BADGES.get<BadgeRecord>(latestKey(slug), 'json');
}

function parseBadgeRequest(url: URL): BadgeRequest | null {
  let path = trimSlashes(url.pathname);
  if (path.startsWith('api/v1/badges/')) path = path.slice('api/v1/badges/'.length);

  let format: BadgeRequest['format'];
  if (path.endsWith('/shields.json')) {
    format = 'shields';
    path = path.slice(0, -'/shields.json'.length);
  } else if (path.endsWith('.svg')) {
    format = 'svg';
    path = path.slice(0, -'.svg'.length);
  } else {
    return null;
  }

  const slug = decodeSlug(path);
  if (!slug) return null;

  return {
    slug,
    branch: readString(url.searchParams.get('branch')),
    format,
  };
}

function badgeStatus(record: BadgeRecord | null): {
  label: string;
  message: string;
  svgColor: string;
  shieldsColor: string;
  title: string;
} {
  if (!record) {
    return {
      label: DEFAULT_LABEL,
      message: 'unknown',
      svgColor: '#9ca3af',
      shieldsColor: 'lightgrey',
      title: 'No Tenet report has been published for this project yet',
    };
  }

  const color = colorForScore(record.score);
  const shortCommit = record.commit ? record.commit.slice(0, 7) : undefined;
  const titleParts = [
    `${record.projectName ?? record.slug}: ${record.score}/100`,
    record.branch ? `branch ${record.branch}` : undefined,
    shortCommit ? `commit ${shortCommit}` : undefined,
    `updated ${record.updatedAt}`,
  ].filter(Boolean);

  return {
    label: record.label,
    message: `${record.score}/100`,
    svgColor: color.svg,
    shieldsColor: color.shields,
    title: titleParts.join(' | '),
  };
}

function renderSvg(status: ReturnType<typeof badgeStatus>): string {
  const labelWidth = textWidth(status.label);
  const messageWidth = textWidth(status.message);
  const width = labelWidth + messageWidth;
  const labelX = Math.round(labelWidth / 2);
  const messageX = labelWidth + Math.round(messageWidth / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${escapeXml(
    `${status.label}: ${status.message}`,
  )}">
  <title>${escapeXml(status.title)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".12"/>
    <stop offset="1" stop-opacity=".12"/>
  </linearGradient>
  <clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#374151"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${status.svgColor}"/>
    <rect width="${width}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelX}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(status.label)}</text>
    <text x="${labelX}" y="14">${escapeXml(status.label)}</text>
    <text x="${messageX}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(status.message)}</text>
    <text x="${messageX}" y="14">${escapeXml(status.message)}</text>
  </g>
</svg>`;
}

function colorForScore(score: number): { svg: string; shields: string } {
  if (score >= 95) return { svg: '#2ea44f', shields: 'brightgreen' };
  if (score >= 90) return { svg: '#3fb950', shields: 'green' };
  if (score >= 80) return { svg: '#a4c639', shields: 'yellowgreen' };
  if (score >= 70) return { svg: '#dfb317', shields: 'yellow' };
  if (score >= 60) return { svg: '#fe7d37', shields: 'orange' };
  return { svg: '#e05d44', shields: 'red' };
}

function textWidth(text: string): number {
  return Math.max(36, Math.ceil(text.length * 6.7 + 12));
}

function isPublishPath(pathname: string): boolean {
  const path = trimSlashes(pathname);
  return path === 'api/v1/badges';
}

function isAuthorized(request: Request, env: Env): boolean {
  const expected = env.BADGE_WRITE_TOKEN;
  if (!expected) return false;

  const auth = request.headers.get('authorization') ?? '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : undefined;
  const provided = bearer ?? request.headers.get('x-tenet-badge-token') ?? '';
  return constantTimeEqual(provided, expected);
}

function constantTimeEqual(a: string, b: string): boolean {
  let result = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return result === 0;
}

function normalizeDashboardUrl(value: string | undefined, slug: string, env: Env): string | undefined {
  if (value && /^https?:\/\//i.test(value)) return value;

  const base = readString(env.DASHBOARD_BASE_URL);
  if (!base) return value;

  const url = new URL(value ?? `/p/${encodeURIComponent(slug)}`, `${base.replace(/\/+$/, '')}/`);
  return url.toString();
}

function branchKey(slug: string, branch: string): string {
  return `badge:${slug}:branch:${branch}`;
}

function latestKey(slug: string): string {
  return `badge:${slug}:latest`;
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function trimSlashes(path: string): string {
  return path.replace(/^\/+|\/+$/g, '');
}

function encodeSlug(slug: string): string {
  return slug
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function decodeSlug(path: string): string {
  const decoded = path
    .split('/')
    .map((part) => safeDecode(part))
    .join('/');
  return trimSlashes(decoded);
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function html(body: string, cacheSeconds = 0): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : 'no-store',
    },
  });
}

function json(body: unknown, status = 200, cacheSeconds = 0): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : 'no-store',
    },
  });
}

function pageStyles(): string {
  return `:root{color-scheme:dark light}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1020;color:#f8fafc;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{width:min(680px,calc(100vw - 40px));padding:48px 0}h1{font-size:clamp(32px,7vw,56px);line-height:1;letter-spacing:0;margin:0 0 18px}p{color:#cbd5e1;font-size:17px;line-height:1.65;max-width:62ch}.eyebrow{color:#7dd3fc;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin:0 0 16px}img{margin:8px 0 26px}dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:0 0 24px}dl div{border:1px solid #263244;background:#111827;padding:12px}dt{color:#94a3b8;font-size:12px;text-transform:uppercase;font-weight:700}dd{margin:4px 0 0;font-size:16px}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}a{color:#06131f;background:#7dd3fc;text-decoration:none;font-weight:800;border-radius:6px;padding:10px 14px}a+a{background:#e2e8f0}`;
}
