import { execSync } from 'child_process';
import pg from 'pg';
import { buildTemplateDbUrl, getAppDbName, getDatabaseUrl } from './db-env.mjs';

const APP_DB_URL = getDatabaseUrl();
const ADMIN_DB_URL = buildTemplateDbUrl();
const APP_DB_NAME = getAppDbName();

async function runQuery(connectionString, query, params = []) {
  const pool = new pg.Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 3000,
  });

  try {
    return await pool.query(query, params);
  } finally {
    await pool.end();
  }
}

async function canConnectToAppDb() {
  try {
    await runQuery(APP_DB_URL, 'SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function waitForAdminDb(maxAttempts = 20) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await runQuery(ADMIN_DB_URL, 'SELECT 1');
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error('Prisma Dev did not become reachable');
}

async function canConnectToAdminDb() {
  try {
    await runQuery(ADMIN_DB_URL, 'SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function ensureDatabaseExists() {
  const exists = await runQuery(
    ADMIN_DB_URL,
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [APP_DB_NAME],
  );

  if (exists.rowCount === 0) {
    await runQuery(ADMIN_DB_URL, `CREATE DATABASE "${APP_DB_NAME}"`);
    return 'created';
  }

  return 'exists';
}

async function schemaLooksReady() {
  try {
    const result = await runQuery(
      APP_DB_URL,
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User'",
    );
    return result.rowCount > 0;
  } catch {
    return false;
  }
}

function applySchema() {
  execSync('node scripts/generate-schema-sql.mjs', { stdio: 'pipe' });
  execSync('node scripts/apply-schema.mjs', { stdio: 'pipe' });
}

async function main() {
  if (!(await canConnectToAdminDb())) {
    console.log('Starting local database...');
    execSync('npx prisma dev --detach -n default', { stdio: 'pipe' });
  }

  await waitForAdminDb();
  await ensureDatabaseExists();

  if (!(await schemaLooksReady())) {
    console.log('Preparing database schema...');
    applySchema();
  }

  if (!(await canConnectToAppDb())) {
    throw new Error('Database is still not reachable after setup');
  }

  console.log('Database ready');
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
