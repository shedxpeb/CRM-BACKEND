/* Behavioral end-to-end verification for the customer-module fix.
 * Drives the real running backend and asserts against direct DB state. */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

const portFile = path.join(require('os').tmpdir(), 'peb-port.txt');
const PORT = fs.readFileSync(portFile, 'utf8').trim();
const BASE = `http://localhost:${PORT}`;
const ORG_A = '681a2e42-e088-4f2c-aff5-51d79e39b56d';
const ORG_B = 'e2c3f82a-e671-4399-88e6-4d9874bc5425';
const TOKEN_B = process.env.TOKEN_B;

let failures = [];
function check(label, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  (' + extra + ')' : ''}`);
  if (!cond) failures.push(label);
}
async function login(email, pass) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  const j = await r.json();
  if (!j?.data?.accessToken) throw new Error(`login failed: ${JSON.stringify(j)}`);
  return j.data.accessToken;
}
async function call(method, p, token, body) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(`${BASE}${p}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, json };
}
const dbCustomer = (id) => prisma.customer.findFirst({ where: { id, organizationId: ORG_A } });
const dbOrgACount = () => prisma.customer.count({ where: { organizationId: ORG_A, isDeleted: false } });

(async () => {
  const token = await login('shedxpebs4@gmail.com', 'Admin@123');

  // 1. List + pagination math
  let r = await call('GET', '/customer?page=1&pageSize=2', token);
  check('list page1 200', r.status === 200);
  const p1 = r.json?.data?.pagination;
  check('page1 total == DB count', p1?.total === await dbOrgACount(), `api:${p1?.total}`);
  check('page1 hasNext true', p1?.hasNext === true);
  const page1Ids = new Set(r.json?.data?.rows?.map((x) => x.id));
  check('page1 all rows org A', r.json?.data?.rows?.every((x) => x.organizationId === ORG_A));

  r = await call('GET', '/customer?page=2&pageSize=2', token);
  const page2Ids = new Set(r.json?.data?.rows?.map((x) => x.id));
  check('page2 no overlap with page1', [...page2Ids].every((id) => !page1Ids.has(id)));
  check('page2 hasNext true', r.json?.data?.pagination?.hasNext === true);

  const lastPage = Math.ceil(p1.total / 2);
  r = await call('GET', `/customer?page=${lastPage}&pageSize=2`, token);
  check('last page hasNext false', r.json?.data?.pagination?.hasNext === false);

  // 2. Search actually filters
  r = await call('GET', '/customer?search=Conv&pageSize=100', token);
  const searchRows = r.json?.data?.rows || [];
  check(
    'search returns only matching rows',
    searchRows.length > 0 &&
      searchRows.every((x) =>
        (x.customerName || '').toLowerCase().includes('conv') ||
        (x.companyName || '').toLowerCase().includes('conv'),
      ),
  );
  check('search total matches filtered count', r.json?.data?.pagination?.total === searchRows.length);

  // 3. Status filter
  r = await call('GET', '/customer?status=Active&pageSize=100', token);
  check('status filter returns only Active', r.json?.data?.rows?.every((x) => x.status === 'Active'));
  const dbActive = await prisma.customer.count({
    where: { organizationId: ORG_A, isDeleted: false, status: 'Active' },
  });
  check('status filter total == DB active count', r.json?.data?.pagination?.total === dbActive);

  // 4. Create -> DB persisted
  const ts = Date.now();
  r = await call('POST', '/customer', token, {
    customerName: `Behave Test ${ts}`,
    companyName: 'Behave Corp',
    mobile: `98${String(ts).slice(-8)}`,
    email: `behave${ts}@test.com`,
    status: 'Active',
    address: 'Behave St',
    city: 'Mumbai',
    state: 'MH',
    country: 'India',
    source: 'Walk-in',
  });
  check('create 201', r.status === 201, `status:${r.status}`);
  const newId = r.json?.data?.id;
  let dbRow = await dbCustomer(newId);
  check('create persisted to DB', !!dbRow);
  check(
    'create persisted fields',
    dbRow?.customerName === `Behave Test ${ts}` &&
      dbRow?.companyName === 'Behave Corp' &&
      dbRow?.mobile === `98${String(ts).slice(-8)}` &&
      dbRow?.organizationId === ORG_A,
    dbRow?.customerName,
  );

  // 5. Update -> DB changed
  r = await call('PATCH', `/customer/${newId}`, token, { companyName: 'Behave Corp Updated', city: 'Delhi' });
  check('update 200', r.status === 200, `status:${r.status}`);
  dbRow = await dbCustomer(newId);
  check('update persisted', dbRow?.companyName === 'Behave Corp Updated' && dbRow?.city === 'Delhi', dbRow?.companyName);

  // 6. Details match DB
  r = await call('GET', `/customer/${newId}`, token);
  check('details 200', r.status === 200);
  check('details match DB', r.json?.data?.companyName === dbRow?.companyName && r.json?.data?.email === dbRow?.email);

  // 7. Stats equal real DB counts
  r = await call('GET', '/customer/stats', token);
  const dbTotal = await dbOrgACount();
  const dbActiveNow = await prisma.customer.count({
    where: { organizationId: ORG_A, isDeleted: false, status: 'Active' },
  });
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dbNewThisMonth = await prisma.customer.count({
    where: { organizationId: ORG_A, isDeleted: false, createdAt: { gte: monthStart } },
  });
  check('stats.total == DB', r.json?.data?.total === dbTotal, `api:${r.json?.data?.total} db:${dbTotal}`);
  check('stats.active == DB', r.json?.data?.active === dbActiveNow, `api:${r.json?.data?.active} db:${dbActiveNow}`);
  check('stats.newThisMonth == DB', r.json?.data?.newThisMonth === dbNewThisMonth, `api:${r.json?.data?.newThisMonth} db:${dbNewThisMonth}`);

  // 8. Employee cannot delete/restore; DB intact
  r = await call('DELETE', `/customer/${newId}`, token, {});
  check('employee delete 403', r.status === 403, `status:${r.status}`);
  check('row still present after denied delete', !!(await dbCustomer(newId)));
  r = await call('POST', `/customer/${newId}/restore`, token, {});
  check('employee restore 403', r.status === 403, `status:${r.status}`);

  // 9. Tenant isolation
  r = await call('GET', '/customer?pageSize=100', TOKEN_B);
  check('orgB list 200', r.status === 200);
  check('orgB sees only orgB rows', r.json?.data?.rows?.every((x) => x.organizationId === ORG_B));
  const dbB = await prisma.customer.count({ where: { organizationId: ORG_B, isDeleted: false } });
  check('orgB total == DB count', r.json?.data?.pagination?.total === dbB, `api:${r.json?.data?.pagination?.total} db:${dbB}`);
  r = await call('GET', `/customer/${newId}`, TOKEN_B);
  check('orgB read orgA customer denied', r.status === 403 || r.status === 404, `status:${r.status}`);
  r = await call('PATCH', `/customer/${newId}`, TOKEN_B, { companyName: 'PWNED' });
  check('orgB update orgA customer denied', r.status === 403 || r.status === 404, `status:${r.status}`);
  dbRow = await dbCustomer(newId);
  check('orgA row unmodified by orgB', dbRow?.companyName === 'Behave Corp Updated', dbRow?.companyName);

  // 10. Module enablement gate (core fix): disable -> 403, enable -> 200
  await prisma.organizationModule.update({
    where: { organizationId_moduleKey: { organizationId: ORG_A, moduleKey: 'customer' } },
    data: { enabled: false },
  });
  r = await call('GET', '/customer?page=1&pageSize=2', token);
  check('disabled module -> 403', r.status === 403, `status:${r.status}`);
  r = await call('GET', '/customer/stats', token);
  check('disabled module stats -> 403', r.status === 403, `status:${r.status}`);
  await prisma.organizationModule.update({
    where: { organizationId_moduleKey: { organizationId: ORG_A, moduleKey: 'customer' } },
    data: { enabled: true },
  });
  r = await call('GET', '/customer?page=1&pageSize=2', token);
  check('re-enabled module -> 200', r.status === 200, `status:${r.status}`);

  // 11. Legacy plural key tolerance
  await prisma.organizationModule.update({
    where: { organizationId_moduleKey: { organizationId: ORG_A, moduleKey: 'customer' } },
    data: { moduleKey: 'customers' },
  });
  r = await call('GET', '/customer?page=1&pageSize=2', token);
  check('plural stored key (customers) still resolves -> 200', r.status === 200, `status:${r.status}`);
  r = await call('GET', '/customer/stats', token);
  check('plural stored key stats -> 200', r.status === 200, `status:${r.status}`);
  await prisma.organizationModule.update({
    where: { organizationId_moduleKey: { organizationId: ORG_A, moduleKey: 'customers' } },
    data: { moduleKey: 'customer' },
  });
  r = await call('GET', '/customer?page=1&pageSize=2', token);
  check('restored canonical key -> 200', r.status === 200, `status:${r.status}`);

  // 12. Cleanup test row
  await prisma.customer.update({ where: { id: newId }, data: { isDeleted: true, deletedAt: new Date() } });
  const gone = await prisma.customer.findFirst({ where: { id: newId, isDeleted: false } });
  check('cleanup soft-deleted test row', !gone);

  console.log(failures.length === 0 ? '\nALL BEHAVIOR CHECKS PASS' : `\nFAILURES: ${failures.join(' | ')}`);
  process.exit(failures.length === 0 ? 0 : 1);
})().catch((e) => { console.error('SCRIPT ERROR:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
