const path = require('path');
const { PdfEngine } = require('../dist/pdf/engine/pdf-engine.js');
const { renderHeader } = require('../dist/pdf/sections/header.section.js');

(async () => {
  const engine = new PdfEngine({ title: 't' });
  console.log('after ctor, buffered pages:', engine.doc.bufferedPageRange().count);
  const y = renderHeader(engine, {
    companyName: 'ShedxPeb LLP', companyAddress: '204, Galaxy Business Park, SG Highway',
    companyPhone: '+91 98765', companyEmail: 'a@b.com', companyWebsite: 'www.x.com', companyGstin: '24A',
    poNumber: 'PO000001', poDate: '04 Aug 2026', revision: 1, status: 'Draft',
  });
  console.log('after header, buffered pages:', engine.doc.bufferedPageRange().count, 'endY:', y);
  engine.setY(y + 8);
  engine.drawLine(34, engine.getY(), 561, engine.getY());
  console.log('after line, buffered pages:', engine.doc.bufferedPageRange().count);
  await engine.finalize();
  console.log('final pages:', engine.getPageCount());
})().catch((e) => { console.error(e); process.exit(1); });
