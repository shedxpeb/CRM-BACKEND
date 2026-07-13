import pg from 'pg';

const pool = new pg.Pool({
  host: '127.0.0.1',
  port: 51214,
  user: 'postgres',
  password: 'postgres',
  database: 'template1',
  ssl: false,
});

try {
  const result = await pool.query('SELECT current_database() AS db');
  console.log('OK', result.rows[0]);
} catch (error) {
  console.error('FAIL', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
