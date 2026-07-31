import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS } from '../helpers/colors';

export interface HeaderData {
  poNumber: string;
  poDate: string;
  paymentTerms?: string;
  expectedDelivery?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyGstin?: string;
}

const BAND_HEIGHT = 82;
const META_HEIGHT = 34;

export function renderHeader(engine: PdfEngine, data: HeaderData) {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  const x0 = margin.left;
  let y = margin.top;

  // ─── Masthead band ──────────────────────────────────────
  doc.save();
  doc.rect(x0, y, cw, BAND_HEIGHT).fill(BRAND.primary);
  doc.restore();

  const logo = engine.loadLogo();
  let textX = x0 + 18;
  if (logo) {
    try {
      doc.image(logo, x0 + 14, y + 14, { width: 56, height: 54 });
      textX = x0 + 86;
    } catch {
      // Ignore logo loading errors
    }
  }

  // Company identity (left)
  let infoY = y + 14;
  doc.font(FONTS.bold).fontSize(16).fillColor(BRAND.white);
  doc.text(data.companyName || 'PEB Systems', textX, infoY, {
    width: cw * 0.52,
    lineBreak: false,
  });
  infoY += 20;

  const contact: string[] = [];
  if (data.companyAddress) contact.push(data.companyAddress);
  if (data.companyPhone) contact.push(`Ph: ${data.companyPhone}`);
  if (data.companyEmail) contact.push(`Email: ${data.companyEmail}`);
  if (data.companyGstin) contact.push(`GSTIN: ${data.companyGstin}`);

  doc.font(FONTS.regular).fontSize(8.5).fillColor(BRAND.lightBlue);
  for (const line of contact.slice(0, 3)) {
    doc.text(line, textX, infoY, { width: cw * 0.52, lineBreak: false });
    infoY += 13;
  }

  // Document title (right)
  doc.font(FONTS.bold).fontSize(24).fillColor(BRAND.white);
  doc.text('PURCHASE ORDER', x0 + cw - 230, y + 20, {
    width: 230,
    align: 'right',
    lineBreak: false,
  });

  doc.font(FONTS.regular).fontSize(9).fillColor(BRAND.lightBlue);
  doc.text(`${data.poNumber}   |   ${data.poDate}`, x0 + cw - 230, y + 52, {
    width: 230,
    align: 'right',
    lineBreak: false,
  });

  y += BAND_HEIGHT + 14;

  // ─── PO meta strip ──────────────────────────────────────
  const cells: { label: string; value: string }[] = [
    { label: 'PO Number', value: data.poNumber },
    { label: 'Date', value: data.poDate },
    { label: 'Payment Terms', value: data.paymentTerms || '-' },
    { label: 'Expected Delivery', value: data.expectedDelivery || '-' },
  ];

  const cellW = cw / cells.length;

  doc.save();
  doc
    .rect(x0, y, cw, META_HEIGHT)
    .lineWidth(0.6)
    .strokeColor(BRAND.darkBorder)
    .stroke();
  doc.restore();

  cells.forEach((cell, i) => {
    const cx = x0 + i * cellW;
    if (i > 0) {
      engine.drawLine(cx, y + 5, cx, y + META_HEIGHT - 5, {
        color: BRAND.border,
        width: 0.5,
      });
    }
    doc.font(FONTS.bold).fontSize(6.5).fillColor(BRAND.muted);
    doc.text(cell.label.toUpperCase(), cx + 8, y + 5, {
      width: cellW - 16,
      lineBreak: false,
    });
    doc.font(FONTS.bold).fontSize(9.5).fillColor(BRAND.black);
    doc.text(cell.value, cx + 8, y + 17, { width: cellW - 16, lineBreak: false });
  });

  y += META_HEIGHT + 14;

  engine.setY(y);
}
