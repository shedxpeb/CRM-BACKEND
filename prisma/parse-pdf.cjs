const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const p = process.argv[2] || path.join(process.env.TEMP || 'C:/Users/Admin/AppData/Local/Temp/opencode', 'po-synth_8.pdf');
const txt = fs.readFileSync(p).toString('latin1');

// Find all page objects
const pageRe = /(\d+) 0 obj\s*<<([^>]*)>>/g;
const pages = [];
let m;
while ((m = pageRe.exec(txt))) {
  if (m[2].includes('/Type /Page') && !m[2].includes('/Type /Pages')) {
    pages.push({ num: m[1], def: m[2] });
  }
}
console.log('PAGES:', pages.map((p) => p.num).join(', '));
for (const pg of pages) {
  const contentMatch = pg.def.match(/\/Contents\s+(\d+) 0 R/);
  if (!contentMatch) { console.log(`page ${pg.num}: no content ref`); continue; }
  const contentObjNum = contentMatch[1];
  const objRe = new RegExp(contentObjNum + ' 0 obj[\\s\\S]*?\\/Length (\\d+)[\\s\\S]*?stream\\r?\\n([\\s\\S]*?)endstream');
  const om = objRe.exec(txt);
  if (!om) { console.log(`page ${pg.num}: content obj ${contentObjNum} not found`); continue; }
  let data;
  try { data = zlib.inflateSync(Buffer.from(om[2], 'latin1')).toString('latin1'); }
  catch (e) { data = om[2]; }
  const textCmds = (data.match(/\((?:[^()\\]|\\.)*\)\s*Tj/g) || []).slice(0, 5).join(' | ');
  console.log(`page ${pg.num}: content starts -> ${data.slice(0, 120).replace(/\n/g, ' ')}`);
  console.log(`   first text ops: ${textCmds.slice(0, 200)}`);
}
