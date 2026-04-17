# Security Scan Report

**Repository:** tenet-dashboard
**Scanned:** 2026-04-17
**Path:** /Users/Jason/Development/tenet-dashboard
**Ecosystems:** Node.js / npm (root + `client/` workspace)
**Languages:** TypeScript, TSX, minimal JS config

---

## Executive Summary

- **CRITICAL:** 0 findings
- **HIGH:** 2 findings (both are dependency CVEs with patches available)
- **MEDIUM:** 4 findings (dependency CVEs + dev-server issues)
- **LOW:** 1 finding
- **INFO:** 2 notes

**Verdict:** CAUTION — no malicious code, but several outdated direct dependencies have published CVEs. Patch before public release.

---

## HIGH Findings

### H1. drizzle-orm SQL injection (GHSA-gpj5-g38j-94v9)

- **File:** `package.json:26` (direct dep `"drizzle-orm": "^0.30.10"`)
- **CVSS:** 7.5 — SQL injection via improperly escaped SQL identifiers
- **Affected:** `<0.45.2` — current range resolves to vulnerable version
- **Fix:** Bump to `drizzle-orm@0.45.2` (semver-major). Audit any `sql.identifier()` / raw identifier usage when upgrading.
- **Recommendation:** **Patch before first push.** This is a high-CVSS injection vuln in a direct dependency that touches the DB layer.

### H2. fastify Content-Type body validation bypass (GHSA-jx2c-rxcm-jvmq)

- **File:** `package.json:27` (direct dep `"fastify": "^4.28.1"`)
- **CVSS:** 7.5 — Tab character in Content-Type header bypasses body validation
- **Affected:** `<5.7.2`
- **Fix:** Bump to `fastify@5.8.5` (semver-major — plugin API changes, `@fastify/cors` and `@fastify/static` will also need major bumps).
- **Recommendation:** **Patch before public exposure.** If the dashboard sits behind Cloudflare Tunnel only, risk is reduced but still worth fixing.

---

## MEDIUM Findings

### M1. fastify X-Forwarded-Proto/Host spoofing (GHSA-444r-cwp2-x5xf)

- Same upgrade as H2 resolves this. CVSS 6.1.
- Relevant if `request.protocol` / `request.host` are trusted for security decisions — check usage.

### M2. vite path traversal in `.map` handling (GHSA-4w7w-66w2-5vf9)

- **File:** `client/package.json:24` (`"vite": "^5.3.1"`)
- Dev-server issue. Impacts developers running `npm run dev`, not production builds.
- **Fix:** `vite@8.0.8` (semver-major).

### M3. esbuild dev server permits arbitrary origin requests (GHSA-67mh-4wv8-2f99)

- Transitive via `drizzle-kit` and `vite`. CVSS 5.3. Dev-only.
- Resolved by the vite/drizzle-kit upgrades above.

### M4. drizzle-kit transitive vulns via esbuild-kit

- **File:** `package.json` devDependencies
- **Fix:** `drizzle-kit@0.31.10` (semver-major). Review schema generation output after upgrade.

---

## LOW Findings

### L1. fastify DoS via unbounded memory in sendWebStream (GHSA-mrq3-vjjr-p77c)

- CVSS 3.7. Resolved by the fastify upgrade in H2.

---

## Informational

### I1. `sample-report.json` contains a string that looks like a secret

- **File:** `sample-report.json:30`
- **Content:** `"snippet": "const JWT_SECRET = 'super-secret-key-2024';"`
- **Assessment:** **FALSE POSITIVE.** This is a sample *audit report payload* describing a fictional finding — the dashboard ingests these from the skills suite. It references `src/middleware/auth.ts`, which does not exist in this repo. Intentional demo content.
- **Recommendation:** No action needed. Optionally add a comment at the top of `sample-report.json` noting it's illustrative.

### I2. Untracked `.impeccable.md` in repo root

- Local design-system context file (not committed). Not a security issue, but:
- **Recommendation:** If this is intended to stay local, add `.impeccable.md` to `.gitignore`. If it should ship with the repo, git-add it.

---

## Positive Findings (Clean)

- **No committed secrets.** `.env` is correctly gitignored and untracked. `.env.example` contains only placeholder values (`change-me-to-something-long-and-random`, `generate-with-openssl-rand-hex-32`).
- **No obfuscated code.** Zero uses of `eval()`, `new Function()`, `atob()`, `fromCharCode()`, or long encoded blobs in source.
- **No malware patterns.** Zero hits for crypto miners, reverse shells, `child_process`, `exec()`, `spawn()`, `os.system()`, or credential-file access patterns.
- **No suspicious install scripts.** Neither `package.json` has `preinstall` / `postinstall` / `prepare` hooks.
- **No suspicious network destinations.** All hardcoded URLs resolve to: GitHub (documentation links), npm registry (in lockfile), W3.org SVG namespace, localhost:8787 (dev proxy), and `tenet.yourdomain.com` (placeholder). No IP-addressed endpoints, no dynamic URL construction.
- **No binary files or executable tracked files.** No `.exe`/`.dll`/`.so`/`.dylib`/`.pyc` in the git index.
- **No typosquatting.** All direct dependencies are well-known, canonical packages.
- **`.gitignore` covers the essentials** (`node_modules/`, `dist/`, `.env`, `data/`, `client/dist/`).

---

## Scan Coverage

| Check | Status | Findings |
|-------|--------|----------|
| Dependency Audit | DONE | 2 high, 4 moderate, 1 low |
| Install Scripts | DONE | 0 |
| Obfuscated Code | DONE | 0 |
| Network Calls | DONE | 0 suspicious |
| Malware Patterns | DONE | 0 |
| Secrets | DONE | 0 real (1 false positive in sample data) |
| File Anomalies | DONE | 1 informational |

---

## Recommendations (prioritized)

**Before first public push:**

1. **Patch drizzle-orm → 0.45.2** (H1). Test DB operations after upgrade — major version bump.
2. **Patch fastify → 5.8.5 + update `@fastify/cors` and `@fastify/static` majors** (H2, M1, L1). Review route handlers for any API changes.
3. **Patch vite → 8.0.8 and drizzle-kit → 0.31.10** (M2, M3, M4). Verify client build still works.

**Nice-to-have:**

4. Add `.impeccable.md` to `.gitignore` (or commit it).
5. Consider a brief header comment in `sample-report.json` clarifying it's illustrative.
6. After upgrades, re-run `npm audit` in both root and `client/` to confirm zero findings.

**Optional, post-push:**

7. Add a GitHub Actions CI workflow that runs `npm audit --audit-level=high` on PRs to catch future regressions.
8. Enable Dependabot for automated dependency PRs.

---

## Verdict Rationale

The codebase itself is clean — zero malicious patterns, zero committed secrets, zero obfuscation, zero suspicious network calls. The only concerns are **two published HIGH CVEs in outdated direct dependencies** (drizzle-orm, fastify), both with straightforward upgrade paths. This is typical "keep deps fresh" work, not a sign of anything malicious. After patching, the repo is safe to publish.
