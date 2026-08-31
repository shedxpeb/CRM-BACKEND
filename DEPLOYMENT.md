# Deployment & Architecture Stability

## Root cause of build failures

`Property 'eventRule' does not exist on PrismaClient` (and similar) means:

1. `schema.prisma` has the models, **but**
2. `prisma generate` did not run (or ran against an older schema) before `tsc` / `nest build`.

This is **architecture drift**, not a hosting problem.

## Local quality gates (required before push)

```bash
npm run ci
```

This runs, in order:

1. `prisma validate`
2. `prisma generate`
3. `architecture:validate` (Schema ↔ Client ↔ Services)
4. `mail:qa`
5. `tsc --noEmit`
6. `nest build`

If any step fails → **do not deploy**.

## CI/CD

GitHub Actions: `.github/workflows/backend-ci.yml`

```
Push / PR
  → npm ci
  → prisma validate
  → prisma generate
  → architecture validate
  → mail:qa
  → tsc --noEmit
  → nest build
  → (lint / tests — currently non-blocking)
  → Deploy Ready signal
```

CI must pass before merging to `main`. Production deployment is handled on Hostinger via PM2.

## Hostinger deployment

```bash
# From PEB-CRM directory on Hostinger server
pm2 restart crm-backend
```

⚠️ **NEVER run `pm2 restart all`** — always restart individual services.

See `PEB-CRM/deploy.sh` and `PEB-CRM/ecosystem.config.js` for full deployment details.

## Health probes:

| Path | Purpose |
|------|---------|
| `GET /live` | Liveness |
| `GET /ready` | Readiness (DB; SMTP if `SMTP_REQUIRED=true`) |
| `GET /health` | Deep check (DB + memory) |
| `GET /` | Service identity |

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production only |
| `develop` | Integration |
| `feature/*` | Auth, tracking, workflow, etc. |

Merge to `main` only after CI passes.

## Environment variables

Never hardcode hostnames or secrets. Set per environment:

See `.env.example` for the full contract. Critical keys:

- `DATABASE_URL` / `DIRECT_DATABASE_URL`
- `JWT_SECRET` / `COOKIE_SECRET`
- `FRONTEND_URL` / `BACKEND_URL`
- `SMTP_*` / `SMTP_REQUIRED`
- `COOKIE_SECURE` / `COOKIE_SAME_SITE` (use `none` + `secure` for cross-site SPA)
- Branding: `BRAND_*`
- Sessions: `SESSION_*`

Moving hosts = change `.env` only. Switch mail providers via `MAIL_PROVIDER` + `SMTP_*` (Gmail → Zoho → Hostinger SMTP) without code changes.

## Architecture validation

`npm run architecture:validate` verifies:

- Required models exist in `schema.prisma`
- Generated Prisma Client includes those models/delegates
- Service `prisma.*` usage only references schema models
- `.env.example` contains required env keys

## `postinstall` / `prebuild`

`package.json` runs `prisma generate` on install and before build so local and CI never typecheck against a stale client.
