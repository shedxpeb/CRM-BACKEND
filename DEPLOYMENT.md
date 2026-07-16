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

Render must **not** deploy until CI is green. Configure Render to deploy from `main` only after checks pass, or use the blueprint `buildCommand` which regenerates the client on every build.

## Render build command (mandatory)

```bash
npm ci && npx prisma generate && npm run architecture:validate && npm run type-check && npm run build
```

Start:

```bash
node scripts/deploy-db.mjs && node dist/main.js
```

`deploy-db.mjs` runs `prisma migrate deploy`, then falls back to `prisma db push` if migrations are behind the schema (current state until a baseline migration is approved). Set `PRISMA_DEPLOY_MODE=push` to skip migrate and push only.

Health probes:

| Path | Purpose |
|------|---------|
| `GET /live` | Liveness (Render `healthCheckPath`) |
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

Never hardcode hostnames or secrets. Set per environment (Render / Hostinger / AWS):

See `.env.example` for the full contract. Critical keys:

- `DATABASE_URL` / `DIRECT_DATABASE_URL`
- `JWT_SECRET` / `COOKIE_SECRET`
- `FRONTEND_URL` / `BACKEND_URL`
- `SMTP_*` / `SMTP_REQUIRED`
- `COOKIE_SECURE` / `COOKIE_SAME_SITE` (use `none` + `secure` for cross-site SPA)
- Branding: `BRAND_*`
- Sessions: `SESSION_*`

Moving hosts = change `.env` only. Switch mail providers via `MAIL_PROVIDER` + `SMTP_*` (Gmail → Zoho → Hostinger SMTP) without code changes.

## Render mail / SMTP egress (critical)

Two separate production failure modes appear in logs:

1. **IPv6 unreachable** — DNS returns Gmail AAAA (`2607:…`), Node connects over IPv6 → `ENETUNREACH`.
2. **SMTP egress blocked** — IPv4 resolves (`172.x…`) but TCP to `:587` / `:465` times out. Common on **Render free tier** (outbound SMTP ports 25/465/587 blocked since 2025-09).

Mitigations in this codebase:

- `SMTP_IP_FAMILY=4` — resolve/connect IPv4 only
- Bounded timeouts: connection 10s / greeting 10s / socket 15s / DNS 5s
- Recovery backoff: 5s → 15s → 30s → 1m → 5m
- **`MAIL_PROVIDER=auto` + `RESEND_API_KEY`** — if SMTP egress fails, switch to Resend HTTPS (port 443)

### Render Dashboard env (required for OTP on free / blocked SMTP)

```
MAIL_PROVIDER=auto
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=noreply@your-verified-domain.com
SMTP_IP_FAMILY=4
```

Create a free API key at https://resend.com — verify a sending domain (Gmail addresses cannot be used as Resend `from` without domain verify).

Local/dev can keep `MAIL_PROVIDER=smtp` with Gmail App Password (SMTP works on your PC).

After deploy, expect either:

- `Transport Verify Result SUCCESS` with `deliveryChannel: smtp`, or
- `Switching to Resend HTTPS fallback` → `deliveryChannel: resend` → `READY`

Then `GET /mail/health` → `state: READY`.

### If logs show IPv4 `resolvedAddress` but still `SMTP_TIMEOUT`

IPv4 preference is working. The remaining failure is **platform egress**, not DNS:

- Render **free** web services block outbound SMTP ports `25`, `465`, and `587` (since 2025-09-26).
- Paid plans (Starter+) allow `465`/`587`; port `25` stays blocked on AWS.
- Local PC can reach Gmail SMTP while free Render cannot.

Fixes (env / plan only — no OTP code changes):

1. Set `MAIL_PROVIDER=auto` + `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (HTTPS, works on free Render), **or**
2. Upgrade the Render web service to a paid plan that allows SMTP `465`/`587`, **or**
3. Move SMTP to Hostinger / another host that allows egress.

Confirm with `GET /mail/status`: `deliveryChannel` is `smtp` or `resend`, and `mail.state=READY`.

## Architecture validation

`npm run architecture:validate` verifies:

- Required models exist in `schema.prisma`
- Generated Prisma Client includes those models/delegates
- Service `prisma.*` usage only references schema models
- `.env.example` contains required env keys

## `postinstall` / `prebuild`

`package.json` runs `prisma generate` on install and before build so local and CI never typecheck against a stale client.
