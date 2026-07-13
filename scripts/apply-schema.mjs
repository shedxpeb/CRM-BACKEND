import fs from 'fs';
import pg from 'pg';
import { getDatabaseUrl, getAppDbName } from './db-env.mjs';

const sql = fs.readFileSync('prisma/init-clean.sql', 'utf8').replace(/^\uFEFF/, '');
const pool = new pg.Pool({
  connectionString: getDatabaseUrl(),
});

try {
  await pool.query(sql);
  console.log(`schema applied to ${getAppDbName()}`);
} catch (error) {
  console.error('apply failed', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
