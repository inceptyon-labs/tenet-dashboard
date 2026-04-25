export interface BadgePublishInput {
  projectSlug: string;
  projectName: string;
  score: number;
  branch: string;
  commit: string;
}

export interface BadgePublishResult {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
}

const BADGE_PUBLISH_TIMEOUT_MS = 5000;

export async function publishBadgeUpdate(input: BadgePublishInput): Promise<BadgePublishResult> {
  const workerUrl = process.env.TENET_BADGE_WORKER_URL?.trim();
  const token = process.env.TENET_BADGE_WRITE_TOKEN?.trim();

  if (!workerUrl || !token) {
    return { ok: true, skipped: true };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BADGE_PUBLISH_TIMEOUT_MS);

  try {
    const response = await fetch(new URL('/api/v1/badges', workerUrl), {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        project_slug: input.projectSlug,
        project_name: input.projectName,
        score: input.score,
        branch: input.branch,
        commit: input.commit,
        dashboard_url: dashboardProjectUrl(input.projectSlug),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: await readResponseText(response),
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function dashboardProjectUrl(projectSlug: string): string | undefined {
  const base = process.env.TENET_PUBLIC_DASHBOARD_URL?.trim();
  if (!base) return undefined;

  const url = new URL(`/p/${encodeURIComponent(projectSlug)}`, `${base.replace(/\/+$/, '')}/`);
  return url.toString();
}

async function readResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return response.statusText;
  }
}
