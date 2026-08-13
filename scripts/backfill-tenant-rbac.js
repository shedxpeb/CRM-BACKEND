/**
 * One-time idempotent backfill for tenant RBAC / module enablement.
 *
 * Fixes two data gaps that cause 403 Forbidden on module endpoints:
 *  1. `OrganizationModule` table is empty -> ModuleAccessGuard rejects every
 *     module request with "Module X is not accessible".
 *  2. `UserRole` assignments are empty -> PermissionInheritanceService
 *     computes zero effective permissions.
 *
 * Module keys are stored SINGULAR to match the permission prefix format
 * (`customer` <-> `customer:list`) used by ModuleAccessGuard and
 * PermissionInheritanceService.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_MODULE_KEYS = [
  'dashboard',
  'lead',
  'customer',
  'project',
  'item-master',
  'inventory',
  'vendor',
  'purchase-order',
  'user',
  'role',
  'organization',
  'tracking',
  'document',
  'task',
  'system',
];

async function main() {
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true },
  });
  console.log(`Found ${organizations.length} organization(s).`);

  // --- 1. Seed OrganizationModule rows (singular keys, enabled) ---
  let moduleCount = 0;
  for (const org of organizations) {
    for (const moduleKey of DEFAULT_MODULE_KEYS) {
      await prisma.organizationModule.upsert({
        where: {
          organizationId_moduleKey: { organizationId: org.id, moduleKey },
        },
        create: {
          organizationId: org.id,
          moduleKey,
          enabled: true,
          enabledAt: new Date(),
        },
        update: {
          enabled: true,
          enabledAt: new Date(),
        },
      });
      moduleCount++;
    }
  }
  console.log(`Seeded/verified ${moduleCount} OrganizationModule rows.`);

  // --- 2. Seed UserRole assignments from user.role -> Role.name ---
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, organizationId: true },
  });

  const roleNameByOrg = new Map();
  const roles = await prisma.role.findMany({
    select: { id: true, name: true, organizationId: true },
  });
  for (const r of roles) {
    const key = r.organizationId;
    if (!roleNameByOrg.has(key)) roleNameByOrg.set(key, new Map());
    roleNameByOrg.get(key).set(r.name.toLowerCase(), r);
  }

  let userRoleCount = 0;
  let skipped = 0;
  for (const u of users) {
    if (!u.organizationId || !u.role) {
      skipped++;
      continue;
    }
    const orgRoles = roleNameByOrg.get(u.organizationId);
    const role = orgRoles?.get(u.role.toLowerCase());
    if (!role) {
      console.warn(
        `No role named "${u.role}" found for user ${u.email} in org ${u.organizationId} - skipping assignment`,
      );
      skipped++;
      continue;
    }
    const existing = await prisma.userRole.findUnique({
      where: {
        userId_roleId_organizationId: {
          userId: u.id,
          roleId: role.id,
          organizationId: u.organizationId,
        },
      },
      select: { id: true },
    });
    if (!existing) {
      await prisma.userRole.create({
        data: {
          userId: u.id,
          roleId: role.id,
          organizationId: u.organizationId,
          assignedById: u.id,
        },
      });
      userRoleCount++;
    }
  }
  console.log(
    `Created ${userRoleCount} UserRole assignment(s) (${skipped} skipped: no org / no matching role / already assigned).`,
  );

  // --- 3. Clear permission cache so effective permissions recalculate ---
  const cleared = await prisma.user.updateMany({
    data: { effectivePermissions: null, lastPermissionCalculation: null },
  });
  console.log(`Cleared permission cache for ${cleared.count} user(s).`);
}

main()
  .catch((e) => {
    console.error('BACKFILL ERROR:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
