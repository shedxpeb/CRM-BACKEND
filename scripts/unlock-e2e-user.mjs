import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = process.env.E2E_EMAIL || 'e2e.prodqa@pebcrm.test';

const result = await prisma.user.updateMany({
  where: { email },
  data: { failedLoginAttempts: 0, lockedUntil: null },
});
console.log(`Unlocked ${result.count} user(s) for ${email}`);
await prisma.$disconnect();
