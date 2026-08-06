const { PdfEngine } = require('../dist/pdf/engine/pdf-engine.js');

async function collect(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks).toString('latin1');
}

async function run(label, fn) {
  const engine = new PdfEngine({ title: 't' });
  fn(engine);
  await engine.finalize();
  const txt = await collect(engine.stream);
  const n = (txt.match(/\/Type\s+\/Page\b/g) || []).length;
  console.log(label, '-> pages:', n);
}

(async () => {
  const cw = () => 527.28;

  await run('text only', (e) => {
    e.setFooterCallback((d) => {
      d.font('Calibri-Bold').fontSize(6).fillColor('#5b6778');
      d.text('Prepared By', 34, 782, { width: 105, align: 'center', lineBreak: false });
    });
  });

  await run('signature line only', (e) => {
    e.setFooterCallback((d) => {
      e.drawLine(44, 797, 129, 797, { color: '#d7dee8', width: 0.5 });
    });
  });

  await run('circle dash stroke', (e) => {
    e.setFooterCallback((d) => {
      d.save();
      d.circle(508, 796, 10).lineWidth(0.6).strokeColor('#9aa7b8').dash(2, { space: 2 }).stroke();
      d.restore();
    });
  });

  await run('circle no dash', (e) => {
    e.setFooterCallback((d) => {
      d.save();
      d.circle(508, 796, 10).lineWidth(0.6).strokeColor('#9aa7b8').stroke();
      d.restore();
    });
  });

  await run('round rect dashed', (e) => {
    e.setFooterCallback((d) => {
      d.save();
      d.roundedRect(480, 786, 80, 20, 8).lineWidth(0.6).strokeColor('#9aa7b8').dash(2, { space: 2 }).stroke();
      d.restore();
    });
  });
})();
