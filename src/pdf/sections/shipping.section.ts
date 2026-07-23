import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS } from '../helpers/colors';

export interface ShippingData {
  shippingTerms?: string;
  shippingMethod?: string;
}

export function renderShipping(engine: PdfEngine, data: ShippingData) {
  if (!data.shippingTerms && !data.shippingMethod) return;

  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  let y = engine.getY();

  const GAP = 15;
  const colWidth = (cw - GAP) / 2;
  const col1 = margin.left;
  const col2 = margin.left + colWidth + GAP;

  const rowHeight = 40;

  engine.ensureSpace(rowHeight + 10);
  y = engine.getY();

  doc.save();
  doc
    .rect(col1, y, colWidth, rowHeight)
    .lineWidth(0.5)
    .fillAndStroke(BRAND.lightBlue, BRAND.panelBorder);
  doc.restore();

  doc.save();
  doc.rect(col1, y, colWidth, 18).fill(BRAND.sectionHeaderBg);
  doc.restore();

  doc.font(FONTS.bold).fontSize(8).fillColor(BRAND.sectionHeaderText);
  doc.text('SHIPPING TERMS', col1 + 8, y + 5, { width: colWidth - 16, lineBreak: false });

  doc.font(FONTS.regular).fontSize(8).fillColor(BRAND.black);
  doc.text(data.shippingTerms || '-', col1 + 8, y + 22, { width: colWidth - 16, lineBreak: false });

  doc.save();
  doc
    .rect(col2, y, colWidth, rowHeight)
    .lineWidth(0.5)
    .fillAndStroke(BRAND.lightBlue, BRAND.panelBorder);
  doc.restore();

  doc.save();
  doc.rect(col2, y, colWidth, 18).fill(BRAND.sectionHeaderBg);
  doc.restore();

  doc.font(FONTS.bold).fontSize(8).fillColor(BRAND.sectionHeaderText);
  doc.text('SHIPPING METHOD', col2 + 8, y + 5, { width: colWidth - 16, lineBreak: false });

  doc.font(FONTS.regular).fontSize(8).fillColor(BRAND.black);
  doc.text(data.shippingMethod || '-', col2 + 8, y + 22, {
    width: colWidth - 16,
    lineBreak: false,
  });

  engine.setY(y + rowHeight + 10);
}
