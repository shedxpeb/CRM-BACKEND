import { PrismaClient } from '@prisma/client';

const url = 'postgresql://postgres:postgres@127.0.0.1:51215/peb-crm?sslmode=disable&pgbouncer=true';
const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  for (let i = 0; i < 5; i++) {
    await prisma.$queryRaw`SELECT 1`;
    const count = await prisma.user.count();
    console.log(`iteration ${i + 1} users=${count}`);
  }
  console.log('all OK');
} catch (e) {
  console.log('FAIL', e.message.split('\n')[0]);
} finally {
  await prisma.$disconnect();
}
