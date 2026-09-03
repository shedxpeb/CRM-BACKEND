import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({
    where: { email: 'admin@crm.local' },
    include: { organization: true }
  });
  
  if (admin) {
    console.log('Admin user verified:');
    console.log('Email:', admin.email);
    console.log('Name:', admin.name);
    console.log('Role:', admin.role);
    console.log('Active:', admin.isActive);
    console.log('Verified:', admin.isVerified);
    console.log('Organization:', admin.organization?.name);
  } else {
    console.log('Admin user not found');
  }
}

main().finally(() => prisma.$disconnect());
