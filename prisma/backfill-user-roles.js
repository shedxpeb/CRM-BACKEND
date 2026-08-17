/* Idempotent backfill: ensure every user has a UserRole join row pointing at
 * the Role matching their role enum in their organization. Safe to re-run. */
const { PrismaClient } = require('@prisma/client');

const DATASOURCES = {
  prod: 'postgresql://peb_crm_user:CHANGE_ME_DB_PASSWORD@dpg-d9jfmu7avr4c73cebbe0-a.oregon-postgres.render.com/peb_crm',
};

const ALIASES = {
  SUPER_ADMIN: ['SUPER_ADMIN', 'Super Admin', 'SuperAdmin'],
  OWNER: ['OWNER', 'Owner', 'COMPANY_OWNER', 'Company Owner'],
  ADMIN: ['ADMIN', 'Admin'],
  EMPLOYEE: ['EMPLOYEE', 'Employee'],
};

async function backfill(target) {
  const url = DATASOURCES[target] || target;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const users = await prisma.user.findMany({
    where: { isDeleted: false },
    select: { id: true, email: true, role: true, organizationId: true },
  });
  let created = 0;
  let skipped = 0;
  let noOrg = 0;
  for (const user of users) {
    if (!user.organizationId) {
      noOrg++;
      continue;
    }
    const existing = await prisma.userRole.count({
      where: { userId: user.id, organizationId: user.organizationId },
    });
    if (existing > 0) {
      skipped++;
      continue;
    }
    const names = ALIASES[user.role] || [user.role];
    const role = await prisma.role.findFirst({
      where: { organizationId: user.organizationId, name: { in: names }, deletedAt: null },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    });
    if (!role) {
      console.log(`NO ROLE for ${user.email} (${user.role}) in org ${user.organizationId}`);
      continue;
    }
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
        organizationId: user.organizationId,
        assignedById: user.id,
      },
    });
    created++;
    console.log(`LINKED ${user.email} (${user.role}) -> Role "${role.name}" (${role.id.slice(0, 8)})`);
  }
  console.log(
    `[${target}] done: ${created} created, ${skipped} already linked, ${noOrg} users without org`,
  );
  await prisma.$disconnect();
}

const target = process.argv[2] || 'prod';
backfill(target).catch((e) => {
  console.error(e);
  process.exit(1);
});
