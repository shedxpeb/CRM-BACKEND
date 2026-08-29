import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInventoryPermissions() {
  try {
    const organization = await prisma.organization.findFirst({
      where: { isDeleted: false },
    });

    if (!organization) {
      console.error('No organization found');
      return;
    }

    console.log('Organization ID:', organization.id);

    const employeeRole = await prisma.role.findFirst({
      where: {
        code: 'EMPLOYEE',
        organizationId: organization.id,
        isDeleted: false,
      },
    });

    if (!employeeRole) {
      console.error('EMPLOYEE role not found');
      return;
    }

    console.log('EMPLOYEE Role ID:', employeeRole.id);

    // Check inventory:delete permission
    let inventoryDeletePermission = await prisma.permission.findFirst({
      where: { key: 'inventory:delete' },
    });

    if (!inventoryDeletePermission) {
      console.log('inventory:delete permission NOT found - creating it...');
      inventoryDeletePermission = await prisma.permission.create({
        data: {
          key: 'inventory:delete',
          module: 'inventory',
          label: 'Delete Inventory',
          description: 'Allow users to delete inventory/stock entries',
          category: 'inventory',
          action: 'delete',
          isSystem: true,
        },
      });
      console.log('Created inventory:delete permission with ID:', inventoryDeletePermission.id);
    } else {
      console.log('inventory:delete permission ID:', inventoryDeletePermission.id);
    }

    // Check if RolePermission exists
    const rolePermission = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: employeeRole.id,
          permissionId: inventoryDeletePermission.id,
        },
      },
    });

    if (!rolePermission) {
      console.log('RolePermission NOT found - creating it...');
      await prisma.rolePermission.create({
        data: {
          roleId: employeeRole.id,
          permissionId: inventoryDeletePermission.id,
        },
      });
      console.log('Created RolePermission entry');
    } else {
      console.log('RolePermission already exists');
    }

    // Update role's permissionIds array
    const allRolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: employeeRole.id },
    });

    const permissionIds = allRolePermissions.map((rp) => rp.permissionId);

    await prisma.role.update({
      where: { id: employeeRole.id },
      data: { permissionIds },
    });

    console.log('Updated role permissionIds count:', permissionIds.length);
    console.log('Successfully ensured inventory:delete permission for EMPLOYEE role');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInventoryPermissions();
