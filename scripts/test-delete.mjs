import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:51214/peb-crm?sslmode=disable';
const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  console.log('deleteMany OK');
} catch (e) {
  console.log('FAIL', e.message);
} finally {
  await prisma.$disconnect();
}
