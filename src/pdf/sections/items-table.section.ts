import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS } from '../helpers/colors';
import { wrapText } from '../helpers/text';
import { formatCurrency, formatQuantity } from '../helpers/currency';

export interface TableRowItem {
  sno: number;
  name: string;
  description?: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  discountType?: string;
  gstRate: number;
  amount: number;
}

export interface TableConfig {
  rowFont: number;
  descFont: number;
  headerFont: number;
  rowPad: number;
  lineGap: number;
  headerHeight: number;
  minRowHeight: number;
}

export const DEFAULT_TABLE_CONFIG: TableConfig = {
  rowFont: 6.8,
  descFont: 6.2,
  headerFont: 6.7,
  rowPad: 3.5,
  lineGap: 2.5,
  headerHeight: 18,
  minRowHeight: 18,
};

export const COMPACT_TABLE_CONFIG: TableConfig = {
  rowFont: 6.4,
  descFont: 5.8,
  headerFont: 6.3,
  rowPad: 3,
  lineGap: 2,
  headerHeight: 16,
  minRowHeight: 15,
};

interface ColumnDef {
  header: string;
  key: keyof TableRowItem | 'description';
  width: number;
  align: 'left' | 'center' | 'right';
}

const BASE_FIXED_WIDTH = 20 + 38 + 34 + 28 + 56 + 44 + 30 + 68; // No/HSN/Qty/Unit/Rate/Disc/GST/Amount

function getColumns(cw: number): ColumnDef[] {
  const itemWidth = Math.max(110, cw - BASE_FIXED_WIDTH);
  return [
    { header: 'No.', key: 'sno', width: 20, align: 'center' },
    { header: 'Item & Description', key: 'description', width: itemWidth, align: 'left' },
    { header: 'HSN', key: 'hsn', width: 38, align: 'center' },
    { header: 'Qty', key: 'quantity', width: 34, align: 'right' },
    { header: 'Unit', key: 'unit', width: 28, align: 'left' },
    { header: 'Rate', key: 'rate', width: 56, align: 'right' },
    { header: 'Disc.', key: 'discount', width: 44, align: 'right' },
    { header: 'GST', key: 'gstRate', width: 30, align: 'center' },
    { header: 'Amount', key: 'amount', width: 68, align: 'right' },
  ];
}

function rowStrings(row: TableRowItem, currency: string): string[] {
  return [
    String(row.sno),
    row.name,
    row.hsn || '-',
    formatQuantity(row.quantity),
    row.unit,
    formatCurrency(row.rate, currency),
    row.discount
      ? `${row.discountType === 'Percentage' ? row.discount + '%' : formatCurrency(row.discount, currency)}`
      : '-',
    row.gstRate ? row.gstRate + '%' : '-',
    formatCurrency(row.amount, currency),
  ];
}

export function measureRowHeight(engine: PdfEngine, row: TableRowItem, cfg: TableConfig): number {
  const doc = engine.doc;
  const cw = engine.getContentWidth();
  const cols = getColumns(cw);
  const itemCol = cols[1];

  const nameLines = wrapText(doc, row.name, FONTS.regular, cfg.rowFont, itemCol.width - 10);
  const descLines = row.description
    ? wrapText(doc, row.description, FONTS.regular, cfg.descFont, itemCol.width - 10)
    : [];
  let maxLines = nameLines.length + descLines.length;

  for (let i = 0; i < cols.length; i++) {
    if (i === 1) continue;
    const lines = wrapText(doc, rowStrings(row, 'INR')[i], FONTS.regular, cfg.rowFont, cols[i].width - 8);
    if (lines.length > maxLines) maxLines = lines.length;
  }

  const lineH = cfg.rowFont + cfg.lineGap;
  return Math.max(maxLines * lineH + cfg.rowPad * 2, cfg.minRowHeight);
}

export function drawTableHeader(engine: PdfEngine, cfg: TableConfig, currency: string): number {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  const cols = getColumns(cw);
  const y = engine.getY();

  engine.drawRect(margin.left, y, cw, cfg.headerHeight, { fillColor: BRAND.primary });

  let currentX = margin.left;
  doc.font(FONTS.bold).fontSize(cfg.headerFont).fillColor(BRAND.white);
  for (const col of cols) {
    const textWidth = doc.widthOfString(col.header);
    let tx = currentX + 5;
    if (col.align === 'center') tx = currentX + (col.width - textWidth) / 2;
    if (col.align === 'right') tx = currentX + col.width - textWidth - 5;
    doc.text(col.header, tx, y + cfg.headerHeight / 2 - 3, { lineBreak: false });
    currentX += col.width;
  }

  return y + cfg.headerHeight;
}

export function drawTableRow(
  engine: PdfEngine,
  row: TableRowItem,
  y: number,
  cfg: TableConfig,
  alt: boolean,
  currency: string,
): number {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  const cols = getColumns(cw);

  const rowHeight = measureRowHeight(engine, row, cfg);
  if (alt) {
    engine.drawRect(margin.left, y, cw, rowHeight, { fillColor: BRAND.rowAlt });
  }

  const lineH = cfg.rowFont + cfg.lineGap;
  const values = rowStrings(row, currency);

  let currentX = margin.left;
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    let cursor = y + cfg.rowPad;

    if (i === 1) {
      // Item name + description (special two-tone block)
      const textWidth = col.width - 10;
      doc.font(FONTS.regular).fontSize(cfg.rowFont).fillColor(BRAND.black);
      for (const line of wrapText(doc, row.name, FONTS.regular, cfg.rowFont, textWidth)) {
        doc.text(line, currentX + 5, cursor, { width: textWidth, lineBreak: false });
        cursor += lineH;
      }
      if (row.description) {
        doc.font(FONTS.regular).fontSize(cfg.descFont).fillColor(BRAND.muted);
        for (const line of wrapText(doc, row.description, FONTS.regular, cfg.descFont, textWidth)) {
          doc.text(line, currentX + 5, cursor, { width: textWidth, lineBreak: false });
          cursor += lineH;
        }
      }
    } else {
      const text = values[i];
      const lines = wrapText(doc, text, FONTS.regular, cfg.rowFont, col.width - 8);
      doc.font(FONTS.regular).fontSize(cfg.rowFont).fillColor(BRAND.black);
      for (const line of lines) {
        const textWidth = doc.widthOfString(line);
        let tx = currentX + 5;
        if (col.align === 'center') tx = currentX + (col.width - textWidth) / 2;
        if (col.align === 'right') tx = currentX + col.width - textWidth - 5;
        doc.text(line, tx, cursor, { lineBreak: false });
        cursor += lineH;
      }
    }
    currentX += col.width;
  }

  engine.drawLine(margin.left, y + rowHeight, margin.left + cw, y + rowHeight, {
    color: BRAND.tableBorder,
    width: 0.3,
  });
  return y + rowHeight;
}

export function drawTableEmpty(
  engine: PdfEngine,
  cfg: TableConfig,
  y: number,
): number {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  const emptyHeight = 26;

  engine.drawRect(margin.left, y, cw, emptyHeight, { fillColor: BRAND.rowAlt });
  doc.font(FONTS.regular).fontSize(cfg.rowFont).fillColor(BRAND.muted);
  doc.text('No items listed', margin.left + 8, y + 9, { width: cw - 16, lineBreak: false });
  return y + emptyHeight;
}

export function closeTable(engine: PdfEngine, startY: number, endY: number): void {
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  const x0 = margin.left;
  const x1 = x0 + cw;

  engine.drawLine(x0, startY, x0, endY, { color: BRAND.tableBorder, width: 0.3 });
  engine.drawLine(x1, startY, x1, endY, { color: BRAND.tableBorder, width: 0.3 });
  engine.drawLine(x0, endY, x1, endY, { color: BRAND.tableBorder, width: 0.4 });

  let colX = x0;
  for (const col of getColumns(cw)) {
    colX += col.width;
    if (colX < x1) {
      engine.drawLine(colX, startY, colX, endY, { color: BRAND.tableBorder, width: 0.3 });
    }
  }
}
