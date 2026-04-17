<p align="center">
  <img src="client/public/tenet-logo.png" alt="Tenet Dashboard" width="180">
</p>

<h1 align="center">Tenet Dashboard</h1>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node 20+">
  <img src="https://img.shields.io/badge/postgres-%3E%3D16-blue" alt="Postgres 16+">
</p>

Self-hosted application health dashboard that receives audit reports from the [Tenet skills suite](https://github.com/tenet-org/tenet-skills) and renders them with composite score rings, dimension tables, findings with copy-to-clipboard fix prompts, trend charts, and retention management.

> Tenet is a two-part system. This repo is the **dashboard** — the web UI and API that stores and displays reports. The companion [**tenet-skills**](https://github.com/tenet-org/tenet-skills) repo is a Claude Code plugin that runs the audits and uploads results here.

```
  Claude Code                          Unraid / Docker
  ┌───────────────────┐                ┌──────────────────────────┐
  │  tenet-skills     │   POST         │  tenet-app (Node 20)     │
  │  (audits your     │──────────────▶ │  Fastify + React SPA     │
  │   codebase)       │  /api/v1/      │  :8787                   │
  └───────────────────┘  reports       └───────────┬──────────────┘
                                                   │
                                       ┌───────────▼──────────────┐
                                       │  tenet-db (Postgres 16+) │
                                       │  Internal only           │
                                       └──────────────────────────┘
                                                   │
                                       ┌───────────▼──────────────┐
                                       │  Cloudflare Tunnel       │
                                       │  tenet.yourdomain.com    │
                                       └──────────────────────────┘
```

## Setup

### 1. Deploy the dashboard

#### Option A: Docker (recommended for Unraid)

```bash
cp -r . /mnt/user/appdata/tenet/
cd /mnt/user/appdata/tenet/

cp .env.example .env
# Edit .env:
#   POSTGRES_PASSWORD=<openssl rand -hex 24>
#   TENET_API_TOKEN=<openssl rand -hex 32>

docker compose up -d
```

Dashboard is at `http://unraid.local:8787`.

#### Option B: Local development

```bash
npm install
cd client && npm install && cd ..

# Create .env with your Postgres connection
cp .env.example .env
# Edit .env:
#   DATABASE_URL=postgres://user:pass@host:port/tenet
#   TENET_API_TOKEN=dev-token

# Create the database and tables
psql your-connection-string -c 'CREATE DATABASE tenet;'
psql your-connection-string/tenet -f sql/init.sql

# Start the dev servers
npm run dev              # API server on :8787
cd client && npm run dev # Vite dev server on :5173 (proxies /api to :8787)
```

### 2. Install the skills plugin

```bash
git clone https://github.com/tenet-org/tenet-skills.git ~/src/tenet-skills
```

Set the environment variables that tell the skills where to upload:

```bash
export HEALTHCHECK_DASHBOARD_URL=https://tenet.yourdomain.com  # or http://localhost:8787
export HEALTHCHECK_API_TOKEN=your-tenet-api-token
```

Then in any project:

```bash
claude --plugin-dir ~/src/tenet-skills
/tenet-skills:tenet-orchestrator
```

The first report creates the project automatically in the dashboard.

### 3. Cloudflare Tunnel (optional, for external access)

```bash
cloudflared tunnel create tenet
cloudflared tunnel route dns tenet tenet.yourdomain.com
# Configure tunnel to point to http://localhost:8787
cloudflared tunnel run tenet
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | Postgres connection string |
| `TENET_API_TOKEN` | Yes | — | Bearer token for write endpoints |
| `PORT` | No | `8787` | Server listen port |
| `HOST` | No | `0.0.0.0` | Server listen host |
| `LOG_LEVEL` | No | `info` | Pino log level |
| `NODE_ENV` | No | — | Set to `production` for static file serving |

For Docker, `POSTGRES_PASSWORD` is also used by the Postgres container.

## API

All write endpoints require `Authorization: Bearer $TENET_API_TOKEN`. Read endpoints are open (designed to run behind a private network or tunnel).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/reports` | Yes | Upload a report from the skills orchestrator |
| `GET` | `/api/v1/projects` | No | List projects with latest scores |
| `GET` | `/api/v1/projects/:slug` | No | Latest report with dimensions and findings |
| `GET` | `/api/v1/projects/:slug/reports` | No | Paginated report history |
| `GET` | `/api/v1/projects/:slug/trends` | No | Score trends over time |
| `GET` | `/api/v1/findings/:id` | No | Single finding detail |
| `GET` | `/api/v1/settings` | No | Current settings |
| `PUT` | `/api/v1/settings` | Yes | Update settings |
| `POST` | `/api/v1/admin/rollup-now` | Yes | Trigger retention rollup |
| `POST` | `/api/v1/admin/delete-expired` | Yes | Delete rolled-up reports |
| `POST` | `/api/v1/admin/wipe-all` | Yes | Wipe all data (requires confirmation body) |

## Data Retention

Reports are retained in full for **90 days** (configurable in Settings). After that, a nightly cron job (3am) rolls them into daily score snapshots — preserving composite and dimension scores but dropping individual findings. Snapshots are retained for **730 days** by default.

You can trigger rollup manually from the Settings page or via `POST /api/v1/admin/rollup-now`.

## Backup

Snapshot the `./data/postgres` directory (Docker) or run `pg_dump` against your database. That's all the state.

## Tech Stack

- **Backend:** Node 20, Fastify 4, Drizzle ORM, Postgres 16+
- **Frontend:** React 18, Vite 5, Tailwind CSS 3, Recharts 2
- **Deploy:** Docker, docker-compose, Cloudflare Tunnel

## Related

- [tenet-skills](https://github.com/tenet-org/tenet-skills) — Claude Code plugin that runs audits and uploads reports to this dashboard

## Contributing

Pull requests welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, commit style, and PR process. All contributors are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

For security issues, please follow the responsible disclosure process in [SECURITY.md](SECURITY.md) rather than opening a public issue.

## License

[MIT](LICENSE) © Inception Labs
