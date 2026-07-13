import pg from 'pg';

const adminUrl = process.env.DATABASE_URL?.replace(/\/[^/?]+(\?|$)/, '/postgres$1');
const pool = new pg.Pool({ connectionString: adminUrl, ssl: false });

try {
  const version = await pool.query('SELECT version()');
  console.log('connected', version.rows[0].version.split(' ').slice(0, 2).join(' '));

  const exists = await pool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, ['peb-crm']);
  if (exists.rowCount === 0) {
    await pool.query(`CREATE DATABASE "peb-crm"`);
    console.log('created database peb-crm');
  } else {
    console.log('database peb-crm already exists');
  }
} catch (error) {
  console.error('setup failed', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
