import pg from 'pg';
import { buildTemplateDbUrl, getAppDbName } from './db-env.mjs';

const admin = new pg.Pool({
  connectionString: buildTemplateDbUrl(),
});
const appDbName = getAppDbName();

try {
  const exists = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [appDbName]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${appDbName}"`);
    console.log(`created ${appDbName}`);
  } else {
    console.log(`${appDbName} exists`);
  }
} finally {
  await admin.end();
}
