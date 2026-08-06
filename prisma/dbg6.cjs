const { PdfEngine } = require('../dist/pdf/engine/pdf-engine.js');

async function collect(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks).toString('latin1');
}

async function run(label, footerFn) {
  const engine = new PdfEngine({ title: 't' });
  engine.setFooterCallback((d, p, t) => footerFn(engine, d, p, t));
  await engine.finalize();
  const txt = await collect(engine.stream);
  const n = (txt.match(/\/Type\s+\/Page\b/g) || []).length;
  console.log(label, '-> pages:', n);
}

const cw = 527.28;
const LEFT = 34;
const RULE_Y = 841.89 - 66;
const SIG_Y = RULE_Y + 6;
const colW = cw / 5;

(async () => {
  await run('full: no circle', (e, d) => {
    e.drawLine(LEFT, RULE_Y, LEFT + cw, RULE_Y, { color: '#1e3a8a', width: 1 });
    ['Prepared By', 'Checked By', 'Approved By', 'Vendor Signature'].forEach((label, i) => {
      const cx = LEFT + i * colW;
      d.font('Calibri-Bold').fontSize(6).fillColor('#5b6778');
      d.text(label, cx, SIG_Y, { width: colW, align: 'center', lineBreak: false });
      e.drawLine(cx + 10, SIG_Y + 15, cx + colW - 10, SIG_Y + 15, { color: '#d7dee8', width: 0.5 });
    });
    d.font('Calibri-Bold').fontSize(4.8).fillColor('#5b6778');
    d.text('COMPANY SEAL', LEFT + 4 * colW, SIG_Y + 20, { width: colW, align: 'center', lineBreak: false });
    d.font('Calibri-Italic').fontSize(6).fillColor('#5b6778');
    d.text('Computer Generated Document', LEFT, SIG_Y + 26, { width: cw * 0.62, lineBreak: false });
    d.font('Calibri').fontSize(6).fillColor('#5b6778');
    d.text('Page 1 of 1', LEFT + cw * 0.62, SIG_Y + 26, { width: cw * 0.38, align: 'right', lineBreak: false });
  });

  await run('full + circle dashed', (e, d) => {
    e.drawLine(LEFT, RULE_Y, LEFT + cw, RULE_Y, { color: '#1e3a8a', width: 1 });
    d.save();
    d.circle(LEFT + 4.5 * colW, SIG_Y + 8, 10).lineWidth(0.6).strokeColor('#9aa7b8').dash(2, { space: 2 }).stroke();
    d.restore();
    d.font('Calibri-Bold').fontSize(4.8).fillColor('#5b6778');
    d.text('COMPANY SEAL', LEFT + 4 * colW, SIG_Y + 20, { width: colW, align: 'center', lineBreak: false });
  });

  await run('full + circle solid', (e, d) => {
    e.drawLine(LEFT, RULE_Y, LEFT + cw, RULE_Y, { color: '#1e3a8a', width: 1 });
    d.save();
    d.circle(LEFT + 4.5 * colW, SIG_Y + 8, 10).lineWidth(0.6).strokeColor('#9aa7b8').stroke();
    d.restore();
    d.font('Calibri-Bold').fontSize(4.8).fillColor('#5b6778');
    d.text('COMPANY SEAL', LEFT + 4 * colW, SIG_Y + 20, { width: colW, align: 'center', lineBreak: false });
  });
})();
