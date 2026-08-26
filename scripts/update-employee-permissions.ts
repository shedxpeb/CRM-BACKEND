/**
 * Temporary script to update EMPLOYEE role permissions
 * This adds 'customer:delete' and 'project:delete' to the EMPLOYEE role in all organizations
 * Run with: npx ts-node scripts/update-employee-permissions.ts
 */
/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating EMPLOYEE role permissions...');

  // Find all Employee roles in all organizations
  const employeeRoles = await prisma.role.findMany({
    where: {
      name: 'Employee',
      isDeleted: false,
    },
  });

  console.log(`Found ${employeeRoles.length} Employee roles to update`);

  for (const role of employeeRoles) {
    const currentPermissions = Array.isArray(role.permissions) ? role.permissions : [];
    
    // Check which permissions need to be added
    const permissionsToAdd: string[] = [];
    
    if (!currentPermissions.includes('customer:delete')) {
      permissionsToAdd.push('customer:delete');
    }
    
    if (!currentPermissions.includes('project:delete')) {
      permissionsToAdd.push('project:delete');
    }

    if (permissionsToAdd.length === 0) {
      console.log(`Organization ${role.organizationId}: Already has all required permissions`);
      continue;
    }

    // Add missing permissions
    const updatedPermissions = [...currentPermissions, ...permissionsToAdd];
    
    await prisma.role.update({
      where: { id: role.id },
      data: {
        permissions: updatedPermissions,
      },
    });

    console.log(`Organization ${role.organizationId}: Added ${permissionsToAdd.join(', ')} to Employee role`);
  }

  console.log('Update complete!');
}

main()
  .catch((e: unknown) => {
    console.error('Error updating permissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
