# Tenet Badge Worker

Public Cloudflare Worker that serves Tenet score badges from KV while keeping the dashboard private.

## Deploy

```bash
cd badge-worker
npx wrangler kv namespace create TENET_BADGES
npx wrangler kv namespace create TENET_BADGES --preview
```

Copy the namespace IDs into `wrangler.jsonc`, set the write token, then deploy:

```bash
npx wrangler secret put BADGE_WRITE_TOKEN
npx wrangler deploy
```

Point a public hostname, such as `tenet-badges.example.com`, at the deployed Worker.

Set `TENET_PROJECT_URL` in `wrangler.jsonc` if you want badge info pages to link somewhere other than the Tenet skills repo.

## Endpoints

```text
GET /api/v1/badges/:projectSlug.svg
GET /api/v1/badges/:projectSlug/shields.json
GET /projects/:projectSlug
GET /about
PUT /api/v1/badges
```

For project slugs that include an owner, slashes are allowed:

```text
/api/v1/badges/inceptyon-labs/tenet-dashboard.svg
```

Use `?branch=name` to request a branch-specific score. Without a branch, the Worker tries `main` first and then falls back to the latest published report.

Wrap badge images in a link to the public info page so README visitors can learn what Tenet is:

```md
[![Tenet Score](https://tenet-badges.example.com/api/v1/badges/gargantua.svg)](https://tenet-badges.example.com/projects/gargantua)
```

## Publish Payload

```json
{
  "project_slug": "tenet-dashboard",
  "project_name": "Tenet Dashboard",
  "score": 99,
  "branch": "main",
  "commit": "abc1234",
  "dashboard_url": "https://tenet.example.com/p/tenet-dashboard"
}
```

The dashboard publishes this automatically when `TENET_BADGE_WORKER_URL` and `TENET_BADGE_WRITE_TOKEN` are configured.
