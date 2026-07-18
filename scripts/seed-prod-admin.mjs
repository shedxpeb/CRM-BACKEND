/**
 * One-time production admin seed — creates a verified OWNER who can login
 * without email OTP (useful when SMTP is blocked on Render free tier).
 *
 * Option A — from your PC (no Render Shell needed):
 *   set DATABASE_URL to the Render Postgres URL, then:
 *   PROD_ADMIN_EMAIL=you@example.com PROD_ADMIN_PASSWORD='YourPass1!' npm run seed:prod-admin
 *
 * Option B — HTTP (after deploy with SEED_ADMIN_SECRET set on Render):
 *   curl -X POST https://YOUR-BACKEND.onrender.com/system/seed-admin \
 *     -H "content-type: application/json" \
 *     -H "x-seed-secret: YOUR_SECRET" \
 *     -d "{\"email\":\"you@example.com\",\"password\":\"YourPass1!\",\"name\":\"Admin\",\"companyName\":\"PEB CRM\"}"
 *   Then delete SEED_ADMIN_SECRET from Render env.
 *
 * Safe to re-run: updates password + keeps isVerified/isActive true.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

const email = (process.env.PROD_ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.PROD_ADMIN_PASSWORD || '';
const name = (process.env.PROD_ADMIN_NAME || 'Admin').trim();
const companyName = (process.env.PROD_ADMIN_COMPANY || 'PEB CRM').trim();

async function loadBootstrap() {
  const distPath = join(__dirname, '..', 'dist', 'common', 'system-bootstrap.js');
  if (!existsSync(distPath)) {
    console.warn('dist/common/system-bootstrap.js not found — skipping system bootstrap (roles/pipelines).');
    return null;
  }
  const mod = await import(pathToFileURL(distPath).href);
  return mod.bootstrapOrganizationSystem;
}

async function main() {
  if (!email || !password) {
    throw new Error(
      'Set PROD_ADMIN_EMAIL and PROD_ADMIN_PASSWORD before running seed-prod-admin.',
    );
  }
  if (password.length < 8) {
    throw new Error('PROD_ADMIN_PASSWORD must be at least 8 characters.');
  }

  const hash = await bcrypt.hash(password, 12);
  let user = await prisma.user.findUnique({ where: { email } });
  let created = false;

  if (!user) {
    const org = await prisma.organization.create({
      data: { name: companyName, email },
    });
    user = await prisma.user.create({
      data: {
        email,
        name,
        password: hash,
        role: 'OWNER',
        organizationType: 'COMPANY',
        organizationId: org.id,
        isVerified: true,
        isActive: true,
      },
    });
    created = true;
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hash,
        name,
        isVerified: true,
        isActive: true,
        isLocked: false,
        lockedUntil: null,
      },
    });
  }

  const bootstrap = await loadBootstrap();
  if (bootstrap && user.organizationId) {
    await bootstrap(prisma, user.organizationId, user.id);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        created,
        email,
        name,
        role: user.role,
        organizationId: user.organizationId,
        isVerified: true,
        isActive: true,
        loginHint: 'Use this email/password on the login form (no OTP).',
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
