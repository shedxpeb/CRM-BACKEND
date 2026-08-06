const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');
const { generatePurchaseOrderPdf } = require('../dist/pdf/templates/purchase-order.template.js');
const fs = require('fs');

const OUT = process.env.TEST_OUT || 'C:\\Users\\Admin\\AppData\\Local\\Temp\\opencode';

function baseData(poNumber) {
  return {
    poNumber,
    poDate: '04 Aug 2026',
    revision: 1,
    status: 'Draft',
    paymentTerms: 'Net 30 days',
    expectedDelivery: '15 Sep 2026',
    projectName: 'Warehouse Expansion',
    warehouseName: 'Main Warehouse',
    company: {
      name: 'ShedxPeb LLP',
      address: '204, Galaxy Business Park, SG Highway',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380054',
      phone: '+91 98765 43210',
      email: 'accounts@shedxpeb.com',
      website: 'www.shedxpeb.com',
      gstin: '24ABCDE1234F1Z5',
    },
    buyer: {
      company: 'Main Warehouse',
      address: 'Plot 12, GIDC, Vatva, Ahmedabad, Gujarat 382445',
      phone: '+91 98765 43210',
      email: 'accounts@shedxpeb.com',
      gstin: '24ABCDE1234F1Z5',
    },
    supplier: {
      company: 'Steel Mart India Pvt Ltd',
      name: 'Rajesh Mehta',
      address: '45, Industrial Area, Phase II',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400061',
      phone: '+91 98200 12345',
      email: 'sales@steelmart.in',
      gstin: '27STLMA5678K1Z2',
    },
    items: [],
    subtotal: 0,
    discount: 0,
    discountType: 'Amount',
    cgst: 0,
    sgst: 0,
    igst: 0,
    packing: 0,
    freight: 0,
    transport: 0,
    other: 0,
    roundOff: 0,
    grandTotal: 0,
    currency: 'INR',
    terms: '1. All goods must conform to agreed specifications.\n2. Delivery before agreed date.\n3. Payment per terms after delivery.\n4. GST as applicable.',
  };
}

function item(name, desc, qty, unit, rate, gst, hsn) {
  const beforeGst = qty * rate;
  const gstAmt = Math.round(beforeGst * gst) / 100;
  return {
    name,
    description: desc,
    hsn: hsn || '7308.90',
    quantity: qty,
    unit,
    rate,
    discount: 0,
    discountType: 'Amount',
    gstRate: gst,
    gstAmount: gstAmt,
    total: Math.round((beforeGst + gstAmt) * 100) / 100,
  };
}

function build(rows) {
  const data = baseData('PO-TEST-' + rows.length);
  for (let i = 0; i < rows.length; i++) {
    data.items.push(item(
      `Structural Steel Beam ISMB ${400 + i}`,
      i % 3 === 0 ? `Hot rolled structural section, Grade Fe500, length ${6 + (i % 4)} m, with mill test certificate` : undefined,
      i + 1, 'Nos', 4200 + i * 25, 18, '7308.90',
    ));
  }
  let subtotal = 0, tax = 0;
  for (const it of data.items) {
    subtotal += it.quantity * it.rate;
    tax += it.gstAmount;
  }
  data.subtotal = Math.round(subtotal * 100) / 100;
  data.igst = Math.round(tax * 100) / 100;
  data.grandTotal = Math.round((subtotal + tax) * 100) / 100;
  return data;
}

async function countPages(buffer) {
  const s = buffer.toString('latin1');
  return (s.match(/\/Type\s*\/Page[^s]/g) || []).length;
}

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const poRes = await client.query(
    `SELECT po.* FROM "PurchaseOrder" po WHERE po."isDeleted" = false ORDER BY po."createdAt" DESC LIMIT 1`,
  );
  const itemRes = await client.query(
    `SELECT * FROM "PurchaseOrderItem" WHERE "purchaseOrderId" = $1`, [poRes.rows[0].id],
  );
  const po = poRes.rows[0];

  // Real PO data (mirror controller mapping)
  const real = baseData(po.poNumber);
  real.revision = po.revision;
  real.status = po.status;
  real.paymentTerms = po.paymentTerms || undefined;
  real.expectedDelivery = po.expectedDeliveryDate ? po.expectedDeliveryDate.toISOString().slice(0, 10) : undefined;
  real.projectName = po.projectName || undefined;
  real.subtotal = Number(po.subtotal);
  real.grandTotal = Number(po.grandTotal);
  real.igst = Number(po.tax);
  real.terms = po.terms || real.terms;
  real.items = itemRes.rows.map((it) => ({
    name: it.itemName,
    description: it.description || undefined,
    hsn: it.hsnCode || undefined,
    quantity: Number(it.quantity),
    unit: it.unit,
    rate: Number(it.rate),
    discount: Number(it.discount) || 0,
    discountType: it.discountType || 'Amount',
    gstRate: it.gstRate ? Number(it.gstRate) : 0,
    gstAmount: Number(it.gstAmount),
    total: Number(it.total),
  }));
  await client.end();

  const cases = { real_1: real, synth_8: build(8), synth_15: build(15), synth_30: build(30) };
  for (const [name, data] of Object.entries(cases)) {
    const stream = await generatePurchaseOrderPdf(data);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buf = Buffer.concat(chunks);
    const pages = await countPages(buf);
    const file = path.join(OUT, `po-${name}.pdf`);
    fs.writeFileSync(file, buf);
    console.log(`${name}: ${buf.length} bytes, ${pages} page(s) -> ${file}`);
  }
})().catch((e) => { console.error('ERROR', e); process.exit(1); });
