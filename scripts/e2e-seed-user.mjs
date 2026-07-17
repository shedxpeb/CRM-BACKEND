import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const email = process.env.E2E_EMAIL || 'e2e.prodqa@pebcrm.test';
const password = process.env.E2E_PASSWORD || 'Test1234!Qa';

async function main() {
  const hash = await bcrypt.hash(password, 12);
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const org = await prisma.organization.create({
      data: { name: `E2E QA Org ${Date.now()}`, email },
    });
    user = await prisma.user.create({
      data: {
        email,
        name: 'E2E QA',
        password: hash,
        role: 'OWNER',
        organizationType: 'COMPANY',
        organizationId: org.id,
        isVerified: true,
        isActive: true,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, isVerified: true, isActive: true },
    });
  }

  const counts = {
    leads: await prisma.lead.count({ where: { isDeleted: false } }),
    customers: await prisma.customer.count({ where: { isDeleted: false } }),
    projects: await prisma.project.count({ where: { isDeleted: false } }),
  };

  process.stdout.write(
    JSON.stringify({
      email,
      password,
      organizationId: user.organizationId,
      counts,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
