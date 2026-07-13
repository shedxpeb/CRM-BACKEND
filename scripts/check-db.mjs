import pg from 'pg';

const pool = new pg.Pool({
  host: '127.0.0.1', port: 51214, user: 'postgres', password: 'postgres', database: 'peb-crm', ssl: false,
});

const dbs = await pool.query('SELECT datname FROM pg_database ORDER BY 1');
console.log('databases:', dbs.rows.map((r) => r.datname));

const tables = await pool.query(
  "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1 LIMIT 20",
);
console.log('tables in current db:', tables.rows.map((r) => r.tablename));

await pool.end();
