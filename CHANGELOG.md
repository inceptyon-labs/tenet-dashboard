# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
