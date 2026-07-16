# Deployment & Architecture Stability

## Root cause of Render failures

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
4. `tsc --noEmit`
5. `nest build`

If any step fails → **do not deploy**.

## CI/CD

GitHub Actions: `.github/workflows/backend-ci.yml`

```
Push / PR
  → npm ci
  → prisma validate
  → prisma generate
  → architecture validate
  → tsc --noEmit
  → nest build
  → (lint / tests)
  → Deploy Ready signal
```

Render must **not** deploy until CI is green. Configure Render to deploy from `main` only after checks pass, or use the blueprint `buildCommand` which regenerates the client on every build.

## Render build command (mandatory)

```bash
npm ci && npx prisma generate && npm run architecture:validate && npm run type-check && npm run build
```

Start:

```bash
npx prisma migrate deploy && node dist/main.js
```

Health check: `GET /health`

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production only |
| `develop` | Integration |
| `feature/*` | Auth, tracking, workflow, etc. |

Merge to `main` only after CI passes.

## Environment variables

Never hardcode hostnames or secrets. Set per environment (Render / Hostinger / AWS):

See `.env.example` for the full contract. Critical keys:

- `DATABASE_URL` / `DIRECT_DATABASE_URL`
- `JWT_SECRET` / `COOKIE_SECRET`
- `FRONTEND_URL` / `BACKEND_URL`
- `SMTP_*`
- `COOKIE_SECURE` / `COOKIE_SAME_SITE` / `COOKIE_DOMAIN`

Moving hosts = change `.env` only.

## Architecture validation

`npm run architecture:validate` verifies:

- Required models exist in `schema.prisma`
- Generated Prisma Client includes those models/delegates
- Service `prisma.*` usage only references schema models
- `.env.example` contains required env keys

## `postinstall` / `prebuild`

`package.json` runs `prisma generate` on install and before build so local and CI never typecheck against a stale client.
