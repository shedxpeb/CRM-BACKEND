import { PrismaClient } from '@prisma/client';

const urls = [
  ['pooler+pgbouncer', 'postgresql://postgres:postgres@127.0.0.1:51214/peb-crm?sslmode=disable&pgbouncer=true'],
  ['direct 51215', 'postgresql://postgres:postgres@127.0.0.1:51215/peb-crm?sslmode=disable'],
  ['pooler plain', 'postgresql://postgres:postgres@127.0.0.1:51214/peb-crm?sslmode=disable'],
];

for (const [label, url] of urls) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await prisma.$queryRaw`SELECT 1`;
    const count = await prisma.user.count();
    console.log(label, 'OK users=', count);
  } catch (e) {
    console.log(label, 'FAIL', e.message.split('\n')[0]);
  } finally {
    await prisma.$disconnect();
  }
}
