import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncEmployeePermissions() {
  try {
    // Get the organization (assuming first one)
    const organization = await prisma.organization.findFirst({
      where: { isDeleted: false },
    });

    if (!organization) {
      console.error('No organization found');
      return;
    }

    console.log('Organization ID:', organization.id);

    // Get the EMPLOYEE role for this organization
    const employeeRole = await prisma.role.findFirst({
      where: {
        code: 'EMPLOYEE',
        organizationId: organization.id,
        isDeleted: false,
      },
    });

    if (!employeeRole) {
      console.error('EMPLOYEE role not found for organization');
      return;
    }

    console.log('EMPLOYEE Role ID:', employeeRole.id);

    // Default EMPLOYEE permissions
    const defaultPermissions = [
      'dashboard:view',
      'lead:list',
      'lead:read',
      'lead:create',
      'lead:update',
      'lead:delete',
      'lead:restore',
      'customer:list',
      'customer:read',
      'customer:create',
      'customer:update',
      'customer:delete',
      'project:list',
      'project:read',
      'project:create',
      'project:update',
      'project:delete',
      'item-master:list',
      'item-master:read',
      'item-master:create',
      'item-master:update',
      'item-master:delete',
      'inventory:list',
      'inventory:read',
      'inventory:create',
      'inventory:update',
      'tracking:read',
      'tracking:update',
      'task:list',
      'task:read',
      'task:create',
      'task:update',
      'system:read',
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const permKey of defaultPermissions) {
      // Get or create the permission
      let permission = await prisma.permission.findFirst({
        where: { key: permKey },
      });

      if (!permission) {
        console.log(`Creating permission: ${permKey}...`);
        const [module, action] = permKey.split(':');
        permission = await prisma.permission.create({
          data: {
            key: permKey,
            module,
            label: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.charAt(0).toUpperCase() + module.slice(1)}`,
            description: `Allow users to ${action} ${module}`,
            category: module,
            action,
            isSystem: true,
          },
        });
      }

      // Check if RolePermission already exists
      const existingRolePermission = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: employeeRole.id,
            permissionId: permission.id,
          },
        },
      });

      if (!existingRolePermission) {
        await prisma.rolePermission.create({
          data: {
            roleId: employeeRole.id,
            permissionId: permission.id,
          },
        });
        console.log(`Added: ${permKey}`);
        addedCount++;
      } else {
        console.log(`Skipped (already exists): ${permKey}`);
        skippedCount++;
      }
    }

    // Update the role's permissionIds array
    const allRolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: employeeRole.id },
    });

    const permissionIds = allRolePermissions.map((rp) => rp.permissionId);

    await prisma.role.update({
      where: { id: employeeRole.id },
      data: { permissionIds },
    });

    console.log(`\nSummary:`);
    console.log(`- Added: ${addedCount} permissions`);
    console.log(`- Skipped: ${skippedCount} permissions`);
    console.log(`- Total: ${permissionIds.length} permissions`);
    console.log('Successfully synced EMPLOYEE role permissions');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncEmployeePermissions();
