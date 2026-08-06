const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(
    `SELECT po.id, po."poNumber", po.status, po."grandTotal", count(pi.id) AS items
     FROM "PurchaseOrder" po
     LEFT JOIN "PurchaseOrderItem" pi ON pi."purchaseOrderId" = po.id
     WHERE po."isDeleted" = false
     GROUP BY po.id
     ORDER BY po."createdAt" DESC
     LIMIT 10`,
  );
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
