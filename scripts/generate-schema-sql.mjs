import { execSync } from 'child_process';
import fs from 'fs';

const sql = execSync(
  'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
  { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
);

fs.writeFileSync('prisma/init-clean.sql', sql, 'utf8');
console.log('wrote', sql.length, 'bytes');
