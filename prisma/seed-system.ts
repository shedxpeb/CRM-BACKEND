/**
 * Fresh-install system seed (no demo CRM data).
 * Ensures every organization has roles, pipelines, and event rules.
 *
 * Usage: npm run seed:system
 */
import { PrismaClient } from '@prisma/client';
import { bootstrapOrganizationSystem } from '../src/common/system-bootstrap';

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true },
  });

  if (!orgs.length) {
    console.log('No organizations found. Register an account first, then run seed:system.');
    return;
  }

  for (const org of orgs) {
    const owner = await prisma.user.findFirst({
      where: { organizationId: org.id, role: 'OWNER' },
      select: { id: true },
    });
    const result = await bootstrapOrganizationSystem(prisma, org.id, owner?.id);
    console.log(
      `✓ ${org.name}: roles upserted, pipelines=${result.pipelineCount}, eventRules=${result.ruleCount}`,
    );
  }

  console.log(`\nSystem seed complete for ${orgs.length} organization(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
