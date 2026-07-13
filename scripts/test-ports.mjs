import pg from 'pg';

async function test(label, config) {
  const pool = new pg.Pool({ ...config, max: 1 });
  try {
    const r = await pool.query('SELECT current_database(), 1 as ok');
    console.log(label, 'OK', r.rows[0]);
  } catch (e) {
    console.log(label, 'FAIL', e.message);
  } finally {
    await pool.end();
  }
}

await test('51214 peb-crm', {
  host: '127.0.0.1', port: 51214, user: 'postgres', password: 'postgres', database: 'peb-crm', ssl: false,
});
await test('51215 peb-crm', {
  host: '127.0.0.1', port: 51215, user: 'postgres', password: 'postgres', database: 'peb-crm', ssl: false,
});
await test('51215 template1', {
  host: '127.0.0.1', port: 51215, user: 'postgres', password: 'postgres', database: 'template1', ssl: false,
});
