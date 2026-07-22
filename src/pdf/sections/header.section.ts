import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS } from '../helpers/colors';

export interface HeaderData {
  poNumber: string;
  poDate: string;
  paymentTerms?: string;
  expectedDelivery?: string;
}

export function renderHeader(engine: PdfEngine, data: HeaderData) {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  let y = margin.top;

  const logo = engine.loadLogo();
  if (logo) {
    try {
      doc.image(logo, margin.left, y, { width: 100, height: 40 });
    } catch {
      // Ignore logo loading errors
    }
  }

  doc.font(FONTS.bold).fontSize(18).fillColor(BRAND.primary);
  doc.text('PURCHASE ORDER', margin.left + cw / 2, y + 4, {
    width: cw,
    align: 'right',
  });

  y += 42;

  engine.drawLine(margin.left, y, margin.left + cw, y, { color: BRAND.primary, width: 1.5 });
  y += 10;

  const col1 = margin.left;
  const col2 = margin.left + cw * 0.5;

  doc.font(FONTS.bold).fontSize(8).fillColor(BRAND.muted);
  doc.text('PO Number:', col1, y, { width: 70, lineBreak: false });
  doc.font(FONTS.regular).fontSize(9).fillColor(BRAND.black);
  doc.text(data.poNumber, col1 + 70, y, { width: 150, lineBreak: false });

  doc.font(FONTS.bold).fontSize(8).fillColor(BRAND.muted);
  doc.text('Date:', col2, y, { width: 40, lineBreak: false });
  doc.font(FONTS.regular).fontSize(9).fillColor(BRAND.black);
  doc.text(data.poDate, col2 + 40, y, { width: 150, lineBreak: false });

  y += 16;

  if (data.paymentTerms) {
    doc.font(FONTS.bold).fontSize(8).fillColor(BRAND.muted);
    doc.text('Payment Terms:', col1, y, { width: 85, lineBreak: false });
    doc.font(FONTS.regular).fontSize(9).fillColor(BRAND.black);
    doc.text(data.paymentTerms, col1 + 85, y, { width: 200, lineBreak: false });
    y += 14;
  }

  if (data.expectedDelivery) {
    doc.font(FONTS.bold).fontSize(8).fillColor(BRAND.muted);
    doc.text('Expected Delivery:', col1, y, { width: 95, lineBreak: false });
    doc.font(FONTS.regular).fontSize(9).fillColor(BRAND.black);
    doc.text(data.expectedDelivery, col1 + 95, y, { width: 200, lineBreak: false });
    y += 14;
  }

  y += 6;
  engine.drawLine(margin.left, y, margin.left + cw, y, { color: BRAND.border, width: 0.5 });
  y += 10;

  engine.setY(y);
}
