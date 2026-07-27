const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function seed() {
  const prisma = new PrismaClient();
  try {
    const hash = await bcrypt.hash('Admin@123', 12);
    const existing = await prisma.user.findUnique({ where: { email: 'shedxpebs4@gmail.com' } });
    if (existing) {
      console.log('User already exists:', existing.id);
      await prisma.$disconnect();
      return;
    }
    const org = await prisma.organization.create({ data: { name: 'PEB CRM', email: 'shedxpebs4@gmail.com' } });
    const user = await prisma.user.create({
      data: {
        email: 'shedxpebs4@gmail.com',
        name: 'Admin',
        password: hash,
        role: 'OWNER',
        organizationType: 'COMPANY',
        organizationId: org.id,
        isVerified: true,
        isActive: true,
      },
    });
    console.log('Seeded org:', org.id, 'user:', user.id);
  } catch(e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
seed();
