#!/usr/bin/env node
/**
 * Architecture Validation Pipeline
 * Ensures Prisma Schema ↔ Prisma Client ↔ Services stay synchronized.
 * Fail CI if any drift is detected.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const SCHEMA = path.join(ROOT, 'prisma', 'schema.prisma');
const SRC = path.join(ROOT, 'src');
const CLIENT_INDEX = path.join(ROOT, 'node_modules', '.prisma', 'client', 'index.d.ts');

function fail(msg) {
  console.error(`\n❌ ARCHITECTURE VALIDATION FAILED\n${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.tsx?$/.test(entry.name)) files.push(full);
  }
  return files;
}

function toCamelModel(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

// ── 1. Schema models / enums ─────────────────────────────
if (!fs.existsSync(SCHEMA)) fail(`Missing schema: ${SCHEMA}`);
const schema = fs.readFileSync(SCHEMA, 'utf8');
const models = [...schema.matchAll(/^model\s+(\w+)/gm)].map((m) => m[1]);
const enums = [...schema.matchAll(/^enum\s+(\w+)/gm)].map((m) => m[1]);

if (models.length === 0) fail('No models found in schema.prisma');
ok(`Schema models: ${models.length} | enums: ${enums.length}`);

const requiredModels = [
  'User', 'Session', 'RefreshToken', 'OtpChallenge', 'AuditLog',
  'Organization', 'Lead', 'Customer', 'Project',
  'StatusPipeline', 'StatusHistory', 'Comment', 'Attachment',
  'ApprovalRequest', 'Notification', 'BusinessEvent', 'EventRule',
];

const missingRequired = requiredModels.filter((m) => !models.includes(m));
if (missingRequired.length) {
  fail(`Required models missing from schema.prisma:\n  - ${missingRequired.join('\n  - ')}`);
}
ok('Required enterprise models present in schema');

// ── 2. Generated Prisma Client ───────────────────────────
if (!fs.existsSync(CLIENT_INDEX)) {
  fail(
    'Prisma Client not generated.\n' +
      'Run: npx prisma generate\n' +
      'Ensure postinstall/CI runs prisma generate before tsc/nest build.',
  );
}

const client = fs.readFileSync(CLIENT_INDEX, 'utf8');
const missingInClient = models.filter((m) => !client.includes(`export type ${m} =`) && !client.includes(`export type ${m}<`));
const missingDelegates = models.filter((m) => {
  const camel = toCamelModel(m);
  return !client.includes(`get ${camel}():`) && !client.includes(`prisma.${camel}`);
});

if (missingInClient.length || missingDelegates.length) {
  fail(
    `Prisma Client is out of sync with schema.\n` +
      (missingInClient.length ? `Missing types:\n  - ${missingInClient.join('\n  - ')}\n` : '') +
      (missingDelegates.length ? `Missing delegates:\n  - ${missingDelegates.map(toCamelModel).join('\n  - ')}\n` : '') +
      `Fix: npx prisma generate`,
  );
}
ok('Prisma Client matches schema models');

// ── 3. Service usage ↔ Schema ────────────────────────────
const sourceFiles = walk(SRC);
const usage = new Set();
const prismaCall = /\bthis\.prisma\.(\w+)\./g;

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = prismaCall.exec(text)) !== null) {
    usage.add(match[1]);
  }
}

const knownDelegates = new Set(models.map(toCamelModel));
const allowlist = new Set(['$transaction', '$queryRaw', '$executeRaw', '$connect', '$disconnect']);

const unknownUsage = [...usage].filter((u) => !knownDelegates.has(u) && !allowlist.has(u) && !u.startsWith('$'));
if (unknownUsage.length) {
  fail(
    `Services reference Prisma delegates not in schema:\n  - ${unknownUsage.join('\n  - ')}\n` +
      `Either add the model to schema.prisma or remove the usage.`,
  );
}
ok(`Service Prisma usage synchronized (${usage.size} delegates referenced)`);

// ── 4. Env contract ──────────────────────────────────────
const envExample = path.join(ROOT, '.env.example');
if (!fs.existsSync(envExample)) fail('Missing .env.example — env contract required');
const envText = fs.readFileSync(envExample, 'utf8');
const requiredEnv = [
  'DATABASE_URL',
  'JWT_SECRET',
  'COOKIE_SECRET',
  'FRONTEND_URL',
  'PORT',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM_EMAIL',
];
const missingEnv = requiredEnv.filter((k) => !envText.includes(`${k}=`) && !envText.includes(`${k} =`));
if (missingEnv.length) {
  fail(`.env.example missing required keys:\n  - ${missingEnv.join('\n  - ')}`);
}
ok('Env contract (.env.example) includes required keys');

console.log('\n✅ Architecture validation passed — Schema ↔ Client ↔ Services are synchronized.\n');
process.exit(0);
