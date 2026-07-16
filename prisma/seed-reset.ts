/**
 * Reset database to a clean testing state for existing modules.
 *
 * Removes: leads, customers, projects, tracking artifacts, sessions (optional keep),
 * OTP challenges, refresh tokens for demo hygiene.
 * Keeps: organizations, users, then re-applies system roles / pipelines / event rules.
 * Resets sequences where present.
 *
 * Usage: npm run seed:reset
 * Env: SEED_RESET_KEEP_SESSIONS=true to retain login sessions
 */
import { PrismaClient } from '@prisma/client';
import { bootstrapOrganizationSystem } from './system-bootstrap';

const prisma = new PrismaClient();

async function resetSequences() {
  const candidates = [
    `"Lead_leadNumber_seq"`,
    `"Customer_customerNumber_seq"`,
    `"Project_projectNumber_seq"`,
  ];
  for (const seq of candidates) {
    try {
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
      console.log(`✓ Reset sequence ${seq}`);
    } catch {
      // Sequence may not exist for UUID-based ids — ignore
    }
  }
}

async function main() {
  const keepSessions = process.env.SEED_RESET_KEEP_SESSIONS === 'true';
  console.log('Resetting transactional data (keeping orgs + users)...');

  // Order: dependents first
  await prisma.approvalRequest.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.statusHistory.deleteMany({});
  await prisma.businessEvent.deleteMany({});
  await prisma.otpChallenge.deleteMany({});

  if (!keepSessions) {
    await prisma.refreshToken.deleteMany({});
    await prisma.session.deleteMany({});
    console.log('✓ Cleared sessions + refresh tokens');
  }

  // Project children
  await prisma.projectTask.deleteMany({}).catch(() => undefined);
  await prisma.projectMilestone.deleteMany({}).catch(() => undefined);
  await prisma.projectTeamMember.deleteMany({}).catch(() => undefined);

  await prisma.project.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.lead.deleteMany({});
  console.log('✓ Cleared leads, customers, projects');

  // Soft-deleted orgs stay; hard-deleted demo not recreated
  await resetSequences();

  const orgs = await prisma.organization.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true },
  });

  for (const org of orgs) {
    const owner = await prisma.user.findFirst({
      where: { organizationId: org.id, role: 'OWNER' },
      select: { id: true },
    });
    const result = await bootstrapOrganizationSystem(prisma, org.id, owner?.id);
    console.log(`✓ Rebuilt system config for ${org.name} (pipelines=${result.pipelineCount}, rules=${result.ruleCount})`);
  }

  // Referential integrity spot-check
  const orphanLeads = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
    `SELECT COUNT(*)::bigint AS c FROM "Lead" l
     LEFT JOIN "Organization" o ON o.id = l."organizationId"
     WHERE o.id IS NULL`,
  ).catch(() => [{ c: 0n }]);

  const orphanCount = Number(orphanLeads[0]?.c ?? 0);
  if (orphanCount > 0) {
    throw new Error(`Referential integrity failed: ${orphanCount} orphan lead(s)`);
  }

  console.log('\n✅ Database reset to clean testing state (system seed only).');
  console.log('Register/login still works. No demo leads/customers/projects remain.');
}

main()
  .catch((e) => {
    console.error('❌ Reset failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
