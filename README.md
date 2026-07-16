# PEB-CRM Backend

## Quality gates (required before deploy)

```bash
npm run ci
```

Runs: `prisma validate` → `prisma generate` → architecture sync → `tsc --noEmit` → `nest build`.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Render build command, branch strategy, and env contract.

## Supported Runtime

- Node.js `22.x` LTS
- npm `10+`
- PostgreSQL-compatible database or Prisma Dev

Use the repo root `.nvmrc` when possible:

```bash
nvm use
```

## Installation

```bash
npm install
cp .env.example .env
```

## Startup Contract

Backend startup does **not** run Prisma CLI commands internally.

Runtime flow:

```text
NestJS -> PrismaService -> prisma.$connect() -> Application Ready
```

If the database is unavailable, the backend retries the connection a few times with logging and then exits with a clear error.

## Optional Developer Commands

These are developer tools only and are never executed during NestJS startup:

```bash
npm run db:dev
npm run db:setup
```

Use `npm run db:dev` only when you want to start Prisma Dev yourself.

## Running the Application

```bash
npm run start:dev
npm run build
npm run start:prod
```

## Health Check

```bash
GET http://localhost:8000/health
```

## Code Quality

```bash
npm run lint
npm run type-check
npm run format
```
