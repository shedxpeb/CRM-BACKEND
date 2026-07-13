import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanAndReseed() {
  console.log('🧹 Cleaning Lead table...');
  
  // Delete all leads
  const deleteResult = await prisma.lead.deleteMany({});
  console.log(`✅ Deleted ${deleteResult.count} leads`);
  
  // Reset identity sequence (PostgreSQL)
  await prisma.$executeRaw`ALTER SEQUENCE "Lead_leadNumber_seq" RESTART WITH 1`;
  console.log('✅ Reset leadNumber sequence to 1');
  
  console.log('🌱 Re-seeding with default data...');
  
  // Run the regular seed
  const { seed } = require('./seed');
  await seed();
  
  console.log('✅ Clean and re-seed completed successfully');
}

cleanAndReseed()
  .catch((e) => {
    console.error('❌ Error during clean and re-seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
