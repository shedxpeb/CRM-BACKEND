const { PdfEngine } = require('../dist/pdf/engine/pdf-engine.js');
const { renderFooter } = require('../dist/pdf/sections/footer.section.js');

async function run(label, fn) {
  const engine = new PdfEngine({ title: 't' });
  fn(engine);
  await engine.finalize();
  const txt = engine.stream.read().toString('latin1');
  const n = (txt.match(/\/Type\s+\/Page\b/g) || []).length;
  console.log(label, '-> pages:', n);
}

(async () => {
  await run('footer-only', (e) => {
    e.setFooterCallback((_d, p, t) => renderFooter(e, { companyName: 'X' }, p, t, '04 Aug 2026'));
  });
})();
