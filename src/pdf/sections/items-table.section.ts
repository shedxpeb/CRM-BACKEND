import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS, PAGE } from '../helpers/colors';
import { wrapText } from '../helpers/text';
import { formatCurrency, formatQuantity } from '../helpers/currency';

export interface TableItem {
  sno: number;
  itemName: string;
  description?: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount?: number;
  discountType?: string;
  gstRate?: number;
  gstAmount?: number;
  total: number;
}

export interface ItemsTableData {
  items: TableItem[];
  currency?: string;
}

interface ColumnDef {
  header: string;
  key: string;
  width: number;
  align: 'left' | 'center' | 'right';
}

const COLUMNS: ColumnDef[] = [
  { header: 'No.', key: 'sno', width: 24, align: 'center' },
  { header: 'Item & Description', key: 'itemName', width: 165, align: 'left' },
  { header: 'HSN', key: 'hsnCode', width: 38, align: 'center' },
  { header: 'Qty', key: 'quantity', width: 36, align: 'center' },
  { header: 'Unit', key: 'unit', width: 30, align: 'center' },
  { header: 'Rate', key: 'rate', width: 62, align: 'right' },
  { header: 'Disc.', key: 'discount', width: 50, align: 'right' },
  { header: 'GST %', key: 'gstRate', width: 38, align: 'center' },
  { header: 'Amount', key: 'total', width: 82, align: 'right' },
];

const ROW_PADDING = 8;
const HEADER_HEIGHT = 26;
const MIN_ROW_HEIGHT = 26;
const FONT_SIZE = 8;
const HEADER_FONT_SIZE = 8;

function getTableWidth(): number {
  return COLUMNS.reduce((sum, c) => sum + c.width, 0);
}

function getRowData(item: TableItem, currency?: string): string[] {
  return [
    String(item.sno),
    item.description ? `${item.itemName}\n${item.description}` : item.itemName,
    item.hsnCode || '-',
    formatQuantity(item.quantity),
    item.unit,
    formatCurrency(item.rate, currency),
    item.discount
      ? `${item.discountType === 'Percentage' ? item.discount + '%' : formatCurrency(item.discount, currency)}`
      : '-',
    item.gstRate ? item.gstRate + '%' : '-',
    formatCurrency(item.total, currency),
  ];
}

function measureRowHeight(engine: PdfEngine, rowData: string[]): number {
  const doc = engine.doc;
  let maxHeight = 0;

  for (let i = 0; i < COLUMNS.length; i++) {
    const lines = wrapText(doc, rowData[i], FONTS.regular, FONT_SIZE, COLUMNS[i].width - 8);
    const h = lines.length * (FONT_SIZE + 3) + ROW_PADDING * 2;
    if (h > maxHeight) maxHeight = h;
  }

  return Math.max(maxHeight, MIN_ROW_HEIGHT);
}

function drawTableHeader(engine: PdfEngine, tableWidth: number, y: number): number {
  const doc = engine.doc;
  const margin = engine.getMargin();

  doc.save();
  doc.rect(margin.left, y, tableWidth, HEADER_HEIGHT).fill(BRAND.primary);
  doc.restore();

  doc.font(FONTS.bold).fontSize(HEADER_FONT_SIZE).fillColor(BRAND.white);

  let currentX = margin.left;
  for (const col of COLUMNS) {
    const textW = doc.widthOfString(col.header);
    const textX =
      col.align === 'right'
        ? currentX + col.width - textW - 5
        : col.align === 'center'
          ? currentX + (col.width - textW) / 2
          : currentX + 5;
    doc.text(col.header, textX, y + 9, { width: col.width - 10, lineBreak: false });
    currentX += col.width;
  }

  return y + HEADER_HEIGHT;
}

function drawTableRow(
  engine: PdfEngine,
  rowData: string[],
  x: number,
  y: number,
  rowHeight: number,
  isAlt: boolean,
  tableWidth: number,
): void {
  const doc = engine.doc;

  if (isAlt) {
    doc.rect(x, y, tableWidth, rowHeight).fill(BRAND.tableAltRow);
  }

  let currentX = x;
  for (let i = 0; i < COLUMNS.length; i++) {
    const col = COLUMNS[i];
    const lines = wrapText(doc, rowData[i], FONTS.regular, FONT_SIZE, col.width - 8);
    let textY = y + ROW_PADDING;

    doc.font(FONTS.regular).fontSize(FONT_SIZE).fillColor(BRAND.black);

    for (const line of lines) {
      const textW = doc.widthOfString(line);
      if (col.align === 'right') {
        doc.text(line, currentX + col.width - textW - 5, textY, {
          width: col.width - 10,
          lineBreak: false,
        });
      } else if (col.align === 'center') {
        doc.text(line, currentX + (col.width - textW) / 2, textY, {
          width: col.width - 10,
          lineBreak: false,
        });
      } else {
        doc.text(line, currentX + 5, textY, { width: col.width - 10, lineBreak: false });
      }
      textY += FONT_SIZE + 3;
    }

    currentX += col.width;
  }
}

function closeTableSegment(engine: PdfEngine, tableWidth: number, startY: number, endY: number) {
  const margin = engine.getMargin();
  const x0 = margin.left;
  const x1 = x0 + tableWidth;

  engine.drawLine(x0, startY, x0, endY, { color: BRAND.tableBorder, width: 0.3 });
  engine.drawLine(x1, startY, x1, endY, { color: BRAND.tableBorder, width: 0.3 });
  engine.drawLine(x0, endY, x1, endY, { color: BRAND.tableBorder, width: 0.3 });
}

function drawColumnLines(engine: PdfEngine, tableWidth: number, startY: number, endY: number) {
  const margin = engine.getMargin();

  let colX = margin.left;
  for (const col of COLUMNS) {
    colX += col.width;
    if (colX < margin.left + tableWidth) {
      engine.drawLine(colX, startY, colX, endY, {
        color: BRAND.tableBorder,
        width: 0.3,
      });
    }
  }
}

export function renderItemsTable(engine: PdfEngine, data: ItemsTableData) {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const tableWidth = getTableWidth();
  let y = engine.getY();

  engine.ensureSpace(HEADER_HEIGHT + MIN_ROW_HEIGHT + 16);
  y = engine.getY();

  if (data.items.length === 0) {
    y = drawTableHeader(engine, tableWidth, y);
    const emptyRowHeight = 30;
    doc.rect(margin.left, y, tableWidth, emptyRowHeight).fill(BRAND.tableAltRow);
    doc.font(FONTS.regular).fontSize(FONT_SIZE).fillColor(BRAND.muted);
    doc.text('No items listed', margin.left + 8, y + 11, {
      width: tableWidth - 16,
      lineBreak: false,
    });
    closeTableSegment(engine, tableWidth, y - HEADER_HEIGHT, y + emptyRowHeight);
    drawColumnLines(engine, tableWidth, y - HEADER_HEIGHT, y + emptyRowHeight);
    y += emptyRowHeight + 12;
    engine.setY(y);
    return;
  }

  let tableStartY = y;
  y = drawTableHeader(engine, tableWidth, y);

  data.items.forEach((item, index) => {
    const rowData = getRowData(item, data.currency);
    const rowHeight = measureRowHeight(engine, rowData);

    if (y + rowHeight > PAGE.height - engine.getMargin().bottom) {
      closeTableSegment(engine, tableWidth, tableStartY, y);
      engine.ensureSpace(HEADER_HEIGHT + MIN_ROW_HEIGHT);
      y = engine.getY();
      tableStartY = y;
      y = drawTableHeader(engine, tableWidth, y);
    }

    drawTableRow(engine, rowData, margin.left, y, rowHeight, index % 2 === 1, tableWidth);
    engine.drawLine(margin.left, y + rowHeight, margin.left + tableWidth, y + rowHeight, {
      color: BRAND.tableBorder,
      width: 0.3,
    });

    y += rowHeight;
  });

  closeTableSegment(engine, tableWidth, tableStartY, y);
  drawColumnLines(engine, tableWidth, tableStartY, y);

  engine.setY(y + 12);
}
