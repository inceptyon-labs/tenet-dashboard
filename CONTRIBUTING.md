# Contributing

Thanks for your interest in contributing to Tenet Dashboard.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to uphold it.

## Development Setup

```bash
# Clone and install
git clone https://github.com/jnew00/tenet-dashboard.git
cd tenet-dashboard
npm install
cd client && npm install && cd ..

# Configure environment
cp .env.example .env
# Set DATABASE_URL and TENET_API_TOKEN in .env

# Run database migrations
npm run db:migrate

# Start dev servers (API on :8787, Vite on :5173)
npm run dev:all
```

**Requirements:** Node 20+, Postgres 16+.

## Making Changes

1. Fork the repo and create a feature branch off `main`.
2. Make your changes. Keep commits focused and atomic.
3. Run a build to verify nothing is broken: `npm run build`
4. Open a pull request against `main`.

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add CSV export for trend data
fix: correct score rollup for projects with no findings
docs: clarify retention window defaults
```

Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`.

## Reporting Bugs

Open a [bug report issue](https://github.com/jnew00/tenet-dashboard/issues/new?template=bug_report.md). Include reproduction steps and your deployment method (Docker or local).

## Requesting Features

Open a [feature request issue](https://github.com/jnew00/tenet-dashboard/issues/new?template=feature_request.md). Describe the problem you're solving, not just the solution.

## Security Issues

**Do not open a public issue.** See [SECURITY.md](SECURITY.md) for the responsible disclosure process.
