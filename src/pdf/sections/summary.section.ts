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
}

const PANEL_WIDTH = 300;
const PANEL_PADDING = 12;
const LABEL_WIDTH = 150;
const ROW_HEIGHT = 17;
const HEADER_HEIGHT = 26;
const TOTAL_HEIGHT = 28;

export function renderSummary(engine: PdfEngine, data: SummaryData) {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  const x = margin.left + cw - PANEL_WIDTH;

  const rows: SummaryRow[] = [
    { label: 'Subtotal', value: formatCurrency(data.subtotal, data.currency) },
  ];

  if (data.discount && data.discount > 0) {
    const discLabel =
      data.discountType === 'Percentage' ? `Discount (${data.discount}%)` : 'Discount';
    const discValue =
      data.discountType === 'Percentage'
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
    rows.push({
      label: 'Packing Charges',
      value: formatCurrency(data.packingCharges, data.currency),
    });
  }

  if (data.shippingCharges && data.shippingCharges > 0) {
    rows.push({
      label: 'Shipping Charges',
      value: formatCurrency(data.shippingCharges, data.currency),
    });
  }

  if (data.otherCharges && data.otherCharges > 0) {
    rows.push({ label: 'Other Charges', value: formatCurrency(data.otherCharges, data.currency) });
  }

  if (data.roundOff && Math.abs(data.roundOff) > 0.001) {
    rows.push({ label: 'Round Off', value: formatCurrency(data.roundOff, data.currency) });
  }

  const panelHeight = HEADER_HEIGHT + rows.length * ROW_HEIGHT + TOTAL_HEIGHT + 4;
  engine.ensureSpace(panelHeight + 40);
  let y = engine.getY();

  // Panel border
  doc.save();
  doc
    .rect(x - 2, y - 2, PANEL_WIDTH + 4, panelHeight + 4)
    .lineWidth(0.6)
    .strokeColor(BRAND.darkBorder)
    .stroke();
  doc.restore();

  // Header strip
  doc.save();
  doc.rect(x, y, PANEL_WIDTH, HEADER_HEIGHT).fill(BRAND.primary);
  doc.restore();

  doc.font(FONTS.bold).fontSize(9.5).fillColor(BRAND.white);
  doc.text('SUMMARY', x + PANEL_PADDING, y + 9, { lineBreak: false });
  y += HEADER_HEIGHT;

  const valueX = x + PANEL_PADDING + LABEL_WIDTH;
  const valueWidth = PANEL_WIDTH - PANEL_PADDING * 2 - LABEL_WIDTH;

  for (const row of rows) {
    doc.font(FONTS.regular).fontSize(8.5).fillColor(BRAND.black);
    doc.text(row.label, x + PANEL_PADDING, y + 5, { width: LABEL_WIDTH, lineBreak: false });
    doc.text(row.value, valueX, y + 5, { width: valueWidth, align: 'right', lineBreak: false });

    engine.drawLine(x, y + ROW_HEIGHT - 1, x + PANEL_WIDTH, y + ROW_HEIGHT - 1, {
      color: BRAND.tableBorder,
      width: 0.3,
    });
    y += ROW_HEIGHT;
  }

  y += 2;

  // Grand total band
  doc.save();
  doc.rect(x, y, PANEL_WIDTH, TOTAL_HEIGHT).fill(BRAND.primary);
  doc.restore();

  doc.font(FONTS.bold).fontSize(9.5).fillColor(BRAND.white);
  doc.text('GRAND TOTAL', x + PANEL_PADDING, y + 9, { width: LABEL_WIDTH, lineBreak: false });
  doc.font(FONTS.bold).fontSize(10.5).fillColor(BRAND.white);
  doc.text(formatCurrency(data.grandTotal, data.currency), valueX, y + 8, {
    width: valueWidth,
    align: 'right',
    lineBreak: false,
  });
  y += TOTAL_HEIGHT;

  // Amount in words
  const words = numberToWords(data.grandTotal);
  y += 8;
  const wordsHeight = doc.heightOfString(words, { width: PANEL_WIDTH });
  doc.font(FONTS.italic).fontSize(7.5).fillColor(BRAND.muted);
  doc.text(words, x, y, { width: PANEL_WIDTH });
  y += wordsHeight + 12;

  engine.setY(y);
}
