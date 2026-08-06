const path = require('path');
const { PdfEngine } = require('../dist/pdf/engine/pdf-engine.js');
const { renderHeader } = require('../dist/pdf/sections/header.section.js');
const { renderAddresses } = require('../dist/pdf/sections/address.section.js');
const {
  DEFAULT_TABLE_CONFIG, measureRowHeight, drawTableHeader, drawTableRow, closeTable,
} = require('../dist/pdf/sections/items-table.section.js');
const {
  DEFAULT_SUMMARY_CONFIG, measureSummary, renderSummary,
} = require('../dist/pdf/sections/summary.section.js');
const { DEFAULT_TERMS_CONFIG, measureTerms, renderTerms } = require('../dist/pdf/sections/terms.section.js');

function pages(engine) { return engine.doc.bufferedPageRange().count; }

(async () => {
  const engine = new PdfEngine({ title: 't' });
  const m = engine.getMargin();
  console.log('0 ctor:', pages(engine));

  engine.setFooterCallback((_doc, pageNum, totalPages) => {
    const { renderFooter } = require('../dist/pdf/sections/footer.section.js');
    renderFooter(engine, { companyName: 'ShedxPeb LLP' }, pageNum, totalPages, '04 Aug 2026');
  });
  console.log('0b after footer cb:', pages(engine));

  let y = renderHeader(engine, {
    companyName: 'ShedxPeb LLP', companyAddress: '204, Galaxy Business Park, SG Highway, Ahmedabad, Gujarat 380054',
    companyPhone: '+91 98765 43210', companyEmail: 'accounts@shedxpeb.com', companyWebsite: 'www.shedxpeb.com', companyGstin: '24ABCDE1234F1Z5',
    poNumber: 'PO000001', poDate: '04 Aug 2026', revision: 1, status: 'Draft',
  });
  console.log('1 header:', pages(engine));
  engine.setY(y + 8);

  y = renderAddresses(engine,
    { title: 'SHIP TO', company: 'Main Warehouse', address: 'Plot 12, GIDC Vatva, Ahmedabad, Gujarat 382445', phone: '123', email: 'a@b.com', gstin: 'G' },
    { title: 'SUPPLIER', company: 'Steel Mart India Pvt Ltd', name: 'Rajesh Mehta', address: '45 Industrial Area Phase II, Mumbai, Maharashtra 400061', phone: '+91 98200', email: 'sales@steelmart.in', gstin: '27STLMA' },
  );
  console.log('2 addresses:', pages(engine));
  engine.setY(y + 8);

  // meta strip replica (drawRect + text)
  engine.drawRect(m.left, engine.getY(), engine.getContentWidth(), 20, { fillColor: '#f3f6fb', strokeColor: '#d7dee8', strokeWidth: 0.5 });
  engine.doc.font('Calibri-Bold').fontSize(5.6).fillColor('#5b6778');
  engine.doc.text('PAYMENT TERMS', m.left + 8, engine.getY() + 3, { lineBreak: false });
  console.log('3 meta strip:', pages(engine));
  engine.setY(engine.getY() + 20 + 8);

  const data = { subtotal: 42000, cgst: 0, sgst: 0, igst: 7560, grandTotal: 49560, currency: 'INR' };
  const summaryH = measureSummary(engine, data, DEFAULT_SUMMARY_CONFIG);
  const termsH = measureTerms(engine, 'T1\nT2\nT3\nT4', DEFAULT_TERMS_CONFIG);
  console.log('4 measured summaryH', summaryH, 'termsH', termsH, 'pages:', pages(engine));

  const rows = [];
  for (let i = 0; i < 8; i++) {
    rows.push({ sno: i + 1, name: 'Beam ' + i, description: 'desc ' + i, hsn: '7308', quantity: i + 1, unit: 'Nos', rate: 4200, discount: 0, discountType: 'Amount', gstRate: 18, amount: 4956 });
  }
  const cfg = DEFAULT_TABLE_CONFIG;
  let ty = drawTableHeader(engine, cfg, 'INR');
  console.log('5 table header:', pages(engine));
  for (let i = 0; i < rows.length; i++) {
    ty = drawTableRow(engine, rows[i], ty, cfg, i % 2 === 1, 'INR');
  }
  closeTable(engine, ty - rows.length * 21, ty);
  console.log('6 table rows:', pages(engine));
  engine.setY(ty + 8);

  const endS = renderSummary(engine, data, DEFAULT_SUMMARY_CONFIG);
  console.log('7 summary:', pages(engine));
  engine.setY(endS + 8);
  const endT = renderTerms(engine, 'T1\nT2\nT3\nT4', DEFAULT_TERMS_CONFIG);
  console.log('8 terms:', pages(engine));
  engine.setY(endT);

  await engine.finalize();
  const txt = engine.stream.read().toString('latin1');
  console.log('OUTPUT pages:', (txt.match(/\/Type\s+\/Page\b/g) || []).length);
})().catch((e) => { console.error(e); process.exit(1); });
