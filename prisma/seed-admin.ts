import { PrismaClient, CrmUserRole, OrganizationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting admin user seed...');

  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: {
      email: 'admin@crm.local',
    },
  });

  if (existingAdmin) {
    console.log('Admin user already exists. Skipping creation.');
    console.log('Email: admin@crm.local');
    console.log('Password: admin123');
    return;
  }

  // Create organization first
  let organization = await prisma.organization.findFirst({
    where: {
      email: 'admin@crm.local',
    },
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: 'PEB CRM Admin',
        email: 'admin@crm.local',
        mobile: '9876543210',
        status: OrganizationStatus.Active,
        maxUsers: 100,
        maxStorageGb: 50,
        subscriptionTier: 'premium',
        country: 'India',
        city: 'Ahmedabad',
        state: 'Gujarat',
      },
    });
    console.log(`Created organization: ${organization.name} (ID: ${organization.id})`);
  }

  // Hash password
  const passwordHash = await bcrypt.hash('admin123', 10);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@crm.local',
      password: passwordHash,
      name: 'System Admin',
      role: CrmUserRole.SUPER_ADMIN,
      isActive: true,
      isVerified: true,
      organizationId: organization.id,
      organizationType: 'COMPANY',
      mobile: '9876543210',
      department: 'Administration',
      designation: 'Super Administrator',
    },
  });

  console.log('Admin user created successfully!');
  console.log('Email: admin@crm.local');
  console.log('Password: admin123');
  console.log('Role: SUPER_ADMIN');
  console.log('Organization ID:', organization.id);
  console.log('User ID:', admin.id);
}

main()
  .catch((e) => {
    console.error('Error seeding admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
