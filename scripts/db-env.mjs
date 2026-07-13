import fs from 'fs';
import path from 'path';

function readEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  const values = {};

  if (!fs.existsSync(envPath)) {
    return values;
  }

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

const envFile = readEnvFile();

export function getEnvValue(key) {
  return process.env[key] || envFile[key];
}

export function getDatabaseUrl() {
  const direct = getEnvValue('DIRECT_DATABASE_URL');
  const primary = getEnvValue('DATABASE_URL');
  if (!direct && !primary) {
    throw new Error('DATABASE_URL or DIRECT_DATABASE_URL must be set in .env');
  }
  return direct || primary;
}

export function buildTemplateDbUrl() {
  const dbUrl = new URL(getDatabaseUrl());
  dbUrl.pathname = '/template1';
  return dbUrl.toString();
}

export function getAppDbName() {
  const dbUrl = new URL(getDatabaseUrl());
  return dbUrl.pathname.replace(/^\//, '') || 'postgres';
}
