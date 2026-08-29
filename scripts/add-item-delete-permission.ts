import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addItemMasterDeletePermission() {
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

    // List all roles for this organization
    const allRoles = await prisma.role.findMany({
      where: {
        organizationId: organization.id,
        isDeleted: false,
      },
    });

    console.log('All roles in organization:');
    allRoles.forEach(role => {
      console.log(`- ${role.name} (code: ${role.code}, id: ${role.id})`);
    });

    // Get the EMPLOYEE role for this organization (case-insensitive)
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
    console.log('Current permissionIds:', employeeRole.permissionIds);

    // Get or create the item-master:delete permission
    let permission = await prisma.permission.findFirst({
      where: { key: 'item-master:delete' },
    });

    if (!permission) {
      console.log('Creating item-master:delete permission...');
      permission = await prisma.permission.create({
        data: {
          key: 'item-master:delete',
          module: 'item-master',
          label: 'Delete Item',
          description: 'Allow users to delete items from Item Master',
          category: 'item-master',
          action: 'delete',
          isSystem: true,
        },
      });
      console.log('Created permission with ID:', permission.id);
    } else {
      console.log('Permission ID:', permission.id);
    }

    // Also create RolePermission entry (this is what the permissions guard uses)
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
      console.log('Created RolePermission entry');
    } else {
      console.log('RolePermission entry already exists');
    }

    // Check if permission is already in the role's permissionIds array
    if (employeeRole.permissionIds.includes(permission.id)) {
      console.log('Permission already in role permissionIds array');
    } else {
      // Add permission to role's permissionIds array
      const updatedRole = await prisma.role.update({
        where: { id: employeeRole.id },
        data: {
          permissionIds: [...employeeRole.permissionIds, permission.id],
        },
      });
      console.log('Updated role permissionIds:', updatedRole.permissionIds);
    }

    console.log('Successfully added item-master:delete permission to EMPLOYEE role');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addItemMasterDeletePermission();
