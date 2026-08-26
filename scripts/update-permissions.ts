/**
 * Update system permissions for existing organization
 * Usage: npx ts-node scripts/update-permissions.ts
 */
import { PrismaClient } from '@prisma/client';
import { bootstrapOrganizationSystem } from '../src/common/system-bootstrap';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding organization...');
  
  // Get the first organization with users
  const org = await prisma.organization.findFirst({
    where: { isDeleted: false },
    include: {
      users: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });

  if (!org) {
    console.error('No organization found. Please register an account first.');
    process.exit(1);
  }

  console.log(`Found organization: ${org.name} (${org.id})`);
  
  const firstUser = org.users[0];
  if (!firstUser) {
    console.error('No users found in organization.');
    process.exit(1);
  }

  console.log(`Using user: ${firstUser.email} (${firstUser.id})`);

  console.log('Updating system roles and permissions...');
  const result = await bootstrapOrganizationSystem(prisma, org.id, firstUser.id);
  
  console.log('✓ System updated successfully:');
  console.log(`  - Pipelines updated: ${result.pipelineCount}`);
  console.log(`  - Event rules updated: ${result.ruleCount}`);
  
  console.log('\nPlease log out and log back in to refresh your permissions.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
