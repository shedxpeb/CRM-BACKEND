const path = require('path');
const { PdfEngine } = require('../dist/pdf/engine/pdf-engine.js');

const origAddPage = PdfEngine.prototype.addPage;
PdfEngine.prototype.addPage = function () {
  console.log('addPage() called. current buffered:', this.doc.bufferedPageRange().count);
  console.log(new Error('stack').stack.split('\n').slice(1, 6).join('\n'));
  return origAddPage.call(this);
};

const { generatePurchaseOrderPdf } = require('../dist/pdf/templates/purchase-order.template.js');

function baseData(poNumber) {
  return {
    poNumber, poDate: '04 Aug 2026', revision: 1, status: 'Draft',
    paymentTerms: 'Net 30', expectedDelivery: '15 Sep 2026', projectName: 'P', warehouseName: 'W',
    company: { name: 'ShedxPeb LLP', address: 'A', city: 'Ahm', state: 'GJ', pincode: '380054', phone: '1', email: 'a@b.com', website: 'w.com', gstin: 'G' },
    buyer: { company: 'W', address: 'B' },
    supplier: { company: 'Steel Mart', name: 'R', address: 'C', city: 'M', state: 'MH', pincode: '1', phone: '2', email: 's@m.in', gstin: 'S' },
    items: [], subtotal: 0, discount: 0, discountType: 'Amount',
    cgst: 0, sgst: 0, igst: 0, packing: 0, freight: 0, transport: 0, other: 0, roundOff: 0, grandTotal: 0, currency: 'INR',
    terms: 'T1\nT2\nT3\nT4',
  };
}

(async () => {
  const data = baseData('PO-T');
  for (let i = 0; i < 8; i++) {
    data.items.push({ name: 'Beam ' + i, description: 'desc ' + i, hsn: '7308', quantity: i + 1, unit: 'Nos', rate: 4200, discount: 0, discountType: 'Amount', gstRate: 18, gstAmount: 756, total: 4956 });
  }
  data.subtotal = 8 * 4200;
  data.igst = 8 * 756;
  data.grandTotal = data.subtotal + data.igst;

  const stream = await generatePurchaseOrderPdf(data);
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  const buf = Buffer.concat(chunks);
  const txt = buf.toString('latin1');
  console.log('OUTPUT page objects:', (txt.match(/\/Type\s+\/Page\b/g) || []).length);
})().catch((e) => { console.error(e); process.exit(1); });
