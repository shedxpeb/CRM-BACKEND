import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS } from '../helpers/colors';
import { formatCurrency, numberToWords } from '../helpers/currency';

export interface SummaryData {
  subtotal: number;
  discount?: number;
  discountType?: string;
  tax: number;
  freight?: number;
  packingCharges?: number;
  shippingCharges?: number;
  otherCharges?: number;
  roundOff?: number;
  grandTotal: number;
  currency?: string;
}

interface SummaryRow {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}

export function renderSummary(engine: PdfEngine, data: SummaryData) {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  let y = engine.getY();

  const tableWidth = 260;
  const labelWidth = 150;
  const valueWidth = tableWidth - labelWidth;
  const x = margin.left + cw - tableWidth;

  doc.font(FONTS.bold).fontSize(9).fillColor(BRAND.primary);
  doc.text('SUMMARY', margin.left, y, { lineBreak: false });
  y += 16;

  const rows: SummaryRow[] = [
    { label: 'Subtotal', value: formatCurrency(data.subtotal, data.currency) },
  ];

  if (data.discount && data.discount > 0) {
    const discLabel = data.discountType === 'Percentage'
      ? `Discount (${data.discount}%)`
      : 'Discount';
    const discValue = data.discountType === 'Percentage'
      ? formatCurrency((data.subtotal * data.discount) / 100, data.currency)
      : formatCurrency(data.discount, data.currency);
    rows.push({ label: discLabel, value: '-' + discValue });
  }

  if (data.tax && data.tax > 0) {
    rows.push({ label: 'GST / Tax', value: formatCurrency(data.tax, data.currency) });
  }

  if (data.freight && data.freight > 0) {
    rows.push({ label: 'Freight / Transport', value: formatCurrency(data.freight, data.currency) });
  }

  if (data.packingCharges && data.packingCharges > 0) {
    rows.push({ label: 'Packing Charges', value: formatCurrency(data.packingCharges, data.currency) });
  }

  if (data.shippingCharges && data.shippingCharges > 0) {
    rows.push({ label: 'Shipping Charges', value: formatCurrency(data.shippingCharges, data.currency) });
  }

  if (data.otherCharges && data.otherCharges > 0) {
    rows.push({ label: 'Other Charges', value: formatCurrency(data.otherCharges, data.currency) });
  }

  if (data.roundOff && Math.abs(data.roundOff) > 0.001) {
    rows.push({ label: 'Round Off', value: formatCurrency(data.roundOff, data.currency) });
  }

  const totalHeight = rows.length * 14 + 32;
  engine.ensureSpace(totalHeight + 20);
  y = engine.getY();

  doc.save();
  doc.rect(x - 8, y - 4, tableWidth + 16, totalHeight + 12)
    .fill(BRAND.summaryBg);
  doc.rect(x - 8, y - 4, tableWidth + 16, totalHeight + 12)
    .lineWidth(0.5)
    .strokeColor(BRAND.summaryBorder)
    .stroke();
  doc.restore();

  let rowY = y + 4;

  for (const row of rows) {
    doc.font(FONTS.regular).fontSize(8).fillColor(BRAND.black);
    doc.text(row.label, x, rowY, { width: labelWidth, lineBreak: false });
    doc.text(row.value, x + labelWidth, rowY, { width: valueWidth, align: 'right', lineBreak: false });

    engine.drawLine(x, rowY + 12, x + tableWidth, rowY + 12, { color: BRAND.tableBorder, width: 0.3 });
    rowY += 14;
  }

  rowY += 2;
  doc.font(FONTS.bold).fontSize(9).fillColor(BRAND.primary);
  doc.text('GRAND TOTAL', x, rowY, { width: labelWidth, lineBreak: false });
  doc.font(FONTS.bold).fontSize(10).fillColor(BRAND.primary);
  doc.text(formatCurrency(data.grandTotal, data.currency), x + labelWidth, rowY, { width: valueWidth, align: 'right', lineBreak: false });

  engine.drawLine(x, rowY + 14, x + tableWidth, rowY + 14, { color: BRAND.primary, width: 1 });

  rowY += 24;
  doc.font(FONTS.italic).fontSize(7.5).fillColor(BRAND.muted);
  doc.text(numberToWords(data.grandTotal), x, rowY, { width: tableWidth, lineBreak: false });

  engine.setY(y + totalHeight + 16);
}
