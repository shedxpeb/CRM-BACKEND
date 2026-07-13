import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  await prisma.$queryRaw`SELECT 1`;
  console.log('queryRaw OK');
  const user = await prisma.user.findFirst();
  console.log('findFirst OK', user?.email ?? 'no users');
} catch (e) {
  console.error('FAIL', e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
