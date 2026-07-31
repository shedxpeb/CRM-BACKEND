const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT "entityType", status, label, "order", "isFinal", "allowedTransitions", "isActive"
     FROM "StatusPipeline"
     WHERE "entityType" = 'customer'
     ORDER BY "order"`,
  );
  console.log('CUSTOMER PIPELINE ROWS:');
  console.log(JSON.stringify(rows, null, 2));

  const enumTypes = await prisma.$queryRawUnsafe(
    `SELECT unnest(enum_range(NULL::"CustomerStatus")) AS value`,
  );
  console.log('CustomerStatus enum:', JSON.stringify(enumTypes.map((r) => r.value)));
})()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
