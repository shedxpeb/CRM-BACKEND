import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS } from '../helpers/colors';
import { formatCurrency, numberToWords } from '../helpers/currency';

export interface SummaryData {
  subtotal: number;
  discount?: number;
  discountType?: string;
  cgst: number;
  sgst: number;
  igst: number;
  packing?: number;
  freight?: number;
  transport?: number;
  other?: number;
  roundOff?: number;
  grandTotal: number;
  currency?: string;
}

export interface SummaryConfig {
  panelWidth: number;
  rowH: number;
  headerH: number;
  totalH: number;
  fontSize: number;
  wordsFont: number;
}

export const DEFAULT_SUMMARY_CONFIG: SummaryConfig = {
  panelWidth: 240,
  rowH: 13,
  headerH: 18,
  totalH: 20,
  fontSize: 7.5,
  wordsFont: 7,
};

export const COMPACT_SUMMARY_CONFIG: SummaryConfig = {
  panelWidth: 240,
  rowH: 11.5,
  headerH: 16,
  totalH: 18,
  fontSize: 7,
  wordsFont: 6.5,
};

export interface SummaryRow {
  label: string;
  value: string;
}

export function buildSummaryRows(data: SummaryData): SummaryRow[] {
  const rows: SummaryRow[] = [
    { label: 'Subtotal', value: formatCurrency(data.subtotal, data.currency) },
  ];

  if (data.discount && data.discount !== 0) {
    const label = data.discountType === 'Percentage' ? `Discount (${data.discount}%)` : 'Discount';
    const value =
      data.discountType === 'Percentage'
        ? formatCurrency((data.subtotal * data.discount) / 100, data.currency)
        : formatCurrency(data.discount, data.currency);
    rows.push({ label, value: '-' + value });
  }

  if (data.cgst && data.cgst !== 0) {
    rows.push({ label: 'CGST', value: formatCurrency(data.cgst, data.currency) });
  }
  if (data.sgst && data.sgst !== 0) {
    rows.push({ label: 'SGST', value: formatCurrency(data.sgst, data.currency) });
  }
  if (data.igst && data.igst !== 0) {
    rows.push({ label: 'IGST', value: formatCurrency(data.igst, data.currency) });
  }
  if (data.packing && data.packing !== 0) {
    rows.push({ label: 'Packing', value: formatCurrency(data.packing, data.currency) });
  }
  if (data.freight && data.freight !== 0) {
    rows.push({ label: 'Freight', value: formatCurrency(data.freight, data.currency) });
  }
  if (data.transport && data.transport !== 0) {
    rows.push({ label: 'Transport', value: formatCurrency(data.transport, data.currency) });
  }
  if (data.other && data.other !== 0) {
    rows.push({ label: 'Other Charges', value: formatCurrency(data.other, data.currency) });
  }
  if (data.roundOff && Math.abs(data.roundOff) > 0.001) {
    const sign = data.roundOff > 0 ? '+' : '-';
    rows.push({
      label: 'Round Off',
      value: sign + formatCurrency(Math.abs(data.roundOff), data.currency),
    });
  }

  return rows;
}

export function measureSummary(engine: PdfEngine, data: SummaryData, cfg: SummaryConfig): number {
  const rows = buildSummaryRows(data);
  const words = numberToWords(data.grandTotal);
  const wordsLines = Math.max(1, Math.ceil(words.length / 100));
  const wordsHeight = wordsLines * (cfg.wordsFont + 2.5);
  const labelH = cfg.wordsFont + 1;
  return cfg.headerH + rows.length * cfg.rowH + cfg.totalH + 5 + labelH + wordsHeight + 3;
}

export function renderSummary(engine: PdfEngine, data: SummaryData, cfg: SummaryConfig): number {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  const x = margin.left + cw - cfg.panelWidth;
  const rows = buildSummaryRows(data);
  const y = engine.getY();

  const panelHeight = cfg.headerH + rows.length * cfg.rowH + cfg.totalH;

  // Panel border
  engine.drawRect(x - 2, y - 2, cfg.panelWidth + 4, panelHeight + 4, {
    strokeColor: BRAND.darkBorder,
    strokeWidth: 0.5,
  });

  // Header
  engine.drawRect(x, y, cfg.panelWidth, cfg.headerH, { fillColor: BRAND.primary });
  doc.font(FONTS.bold).fontSize(7.5).fillColor(BRAND.white);
  doc.text('SUMMARY', x + 10, y + cfg.headerH / 2 - 2.5, { lineBreak: false });

  const labelX = x + 10;
  const valueX = x + 10 + 120;
  const valueWidth = cfg.panelWidth - 20 - 120;

  let cursor = y + cfg.headerH;
  doc.font(FONTS.regular).fontSize(cfg.fontSize).fillColor(BRAND.black);
  for (const row of rows) {
    doc.text(row.label, labelX, cursor + 3.5, { width: 118, lineBreak: false });
    doc.text(row.value, valueX, cursor + 3.5, {
      width: valueWidth,
      align: 'right',
      lineBreak: false,
    });
    engine.drawLine(x, cursor + cfg.rowH - 1, x + cfg.panelWidth, cursor + cfg.rowH - 1, {
      color: BRAND.tableBorder,
      width: 0.3,
    });
    cursor += cfg.rowH;
  }

  // Grand total band
  engine.drawRect(x, cursor, cfg.panelWidth, cfg.totalH, { fillColor: BRAND.grandTotalBg });
  doc.font(FONTS.bold).fontSize(cfg.fontSize).fillColor(BRAND.grandTotalText);
  doc.text('GRAND TOTAL', labelX, cursor + cfg.totalH / 2 - 3, { lineBreak: false });
  doc
    .font(FONTS.bold)
    .fontSize(cfg.fontSize + 1.2)
    .fillColor(BRAND.grandTotalText);
  doc.text(formatCurrency(data.grandTotal, data.currency), valueX, cursor + cfg.totalH / 2 - 3.5, {
    width: valueWidth,
    align: 'right',
    lineBreak: false,
  });
  cursor += cfg.totalH;

  // Amount in words — full width
  const words = numberToWords(data.grandTotal);
  cursor += 5;
  doc
    .font(FONTS.bold)
    .fontSize(cfg.wordsFont - 0.5)
    .fillColor(BRAND.muted);
  doc.text('AMOUNT IN WORDS:', margin.left, cursor, { lineBreak: false });
  cursor += cfg.wordsFont + 1;
  const wordsWidth = cw;
  const lines = words.match(/.{1,100}/g) || [words];
  doc.font(FONTS.italic).fontSize(cfg.wordsFont).fillColor(BRAND.black);
  for (const line of lines) {
    doc.text(line, margin.left, cursor, { width: wordsWidth, lineBreak: false });
    cursor += cfg.wordsFont + 2.5;
  }

  return cursor + 3;
}
