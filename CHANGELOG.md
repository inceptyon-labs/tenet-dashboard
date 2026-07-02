# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Correctness dimension** — registered `correctness` in the server and client dimension registries (default weight 1.3, label "Correctness", color `#F87171`) and in the seeded `dimension_weights`, so reports from the new `tenet-correctness` skill render first-class.
- **Accepted-risk badge** — findings the audit suppressed (via `tenet-ignore` comments or `[suppressions]` config) now carry `suppressed` / `suppressed_reason`. The finding card shows an "✓ Accepted risk" badge, dims the card, and displays the acceptance reason. New `findings.suppressed` / `findings.suppressed_reason` columns (auto-added via `ALTER TABLE ... IF NOT EXISTS`); ingest also derives the flag from the legacy `Suppressed: <reason>` description convention for back-compatibility.

## [1.0.0] - 2026-04-17

### Added
- Initial release.
- Fastify API server with bearer-token auth for write endpoints.
- React SPA with composite score rings, dimension tables, and finding cards.
- Copy-to-clipboard fix prompts on findings.
- Trend charts (Recharts) for score history per project.
- Drizzle ORM schema for projects, reports, dimensions, findings, and score snapshots.
- Nightly retention cron — rolls up reports older than 90 days into daily snapshots.
- Docker + docker-compose deployment targeting Unraid / Cloudflare Tunnel.
- Settings page for configuring retention windows and manual admin actions.
