import pg from 'pg';

const pool = new pg.Pool({
  host: '127.0.0.1', port: 51215, user: 'postgres', password: 'postgres', database: 'peb-crm', ssl: false,
});

try {
  const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1 LIMIT 5");
  console.log('tables:', tables.rows.map((r) => r.tablename));
  const users = await pool.query('SELECT COUNT(*)::int AS count FROM "User"');
  console.log('users:', users.rows[0].count);
} catch (e) {
  console.log('error:', e.message);
} finally {
  await pool.end();
}
