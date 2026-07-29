const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
(async () => {
  const hash = await bcrypt.hash('Admin@123', 12);
  const prisma = new PrismaClient();
  await prisma.user.update({ where: { email: 'shedxpebs4@gmail.com' }, data: { password: hash } });
  console.log('Password updated');
  await prisma.$disconnect();
})();
