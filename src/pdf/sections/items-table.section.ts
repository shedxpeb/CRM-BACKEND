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
  fontSize?: number;
}

const COLUMNS: ColumnDef[] = [
  { header: '#', key: 'sno', width: 22, align: 'center' },
  { header: 'Description', key: 'itemName', width: 155, align: 'left' },
  { header: 'HSN', key: 'hsnCode', width: 45, align: 'center' },
  { header: 'Qty', key: 'quantity', width: 42, align: 'right' },
  { header: 'Unit', key: 'unit', width: 32, align: 'center' },
  { header: 'Rate', key: 'rate', width: 60, align: 'right' },
  { header: 'Disc.', key: 'discount', width: 50, align: 'right' },
  { header: 'GST %', key: 'gstRate', width: 40, align: 'center' },
  { header: 'Amount', key: 'total', width: 65, align: 'right' },
];

const TABLE_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);
const ROW_PADDING = 6;
const HEADER_HEIGHT = 22;
const MIN_ROW_HEIGHT = 24;
const FONT_SIZE = 7.5;
const HEADER_FONT_SIZE = 7;

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

function drawTableHeader(engine: PdfEngine, y: number): number {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const _x = margin.left;

  doc.rect(margin.left, y, TABLE_WIDTH, HEADER_HEIGHT).fill(BRAND.tableHeaderBg);

  doc.font(FONTS.bold).fontSize(HEADER_FONT_SIZE).fillColor(BRAND.white);

  let currentX = margin.left;
  for (const col of COLUMNS) {
    const textX =
      col.align === 'right'
        ? currentX + col.width - doc.widthOfString(col.header) - 4
        : col.align === 'center'
          ? currentX + (col.width - doc.widthOfString(col.header)) / 2
          : currentX + 4;
    doc.text(col.header, textX, y + 6, { width: col.width - 8, lineBreak: false });
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
): void {
  const doc = engine.doc;

  if (isAlt) {
    doc.rect(x, y, TABLE_WIDTH, rowHeight).fill(BRAND.tableAltRow);
  }

  let currentX = x;
  for (let i = 0; i < COLUMNS.length; i++) {
    const col = COLUMNS[i];
    const lines = wrapText(doc, rowData[i], FONTS.regular, FONT_SIZE, col.width - 8);
    let textY = y + ROW_PADDING;

    doc.font(FONTS.regular).fontSize(FONT_SIZE).fillColor(BRAND.black);

    for (const line of lines) {
      if (col.align === 'right') {
        const tw = doc.widthOfString(line);
        doc.text(line, currentX + col.width - tw - 4, textY, {
          width: col.width - 8,
          lineBreak: false,
        });
      } else if (col.align === 'center') {
        const tw = doc.widthOfString(line);
        doc.text(line, currentX + (col.width - tw) / 2, textY, {
          width: col.width - 8,
          lineBreak: false,
        });
      } else {
        doc.text(line, currentX + 4, textY, { width: col.width - 8, lineBreak: false });
      }
      textY += FONT_SIZE + 3;
    }

    currentX += col.width;
  }
}

export function renderItemsTable(engine: PdfEngine, data: ItemsTableData) {
  const doc = engine.doc;
  const margin = engine.getMargin();
  let y = engine.getY();

  doc.font(FONTS.bold).fontSize(9).fillColor(BRAND.primary);
  doc.text('ITEMS', margin.left, y, { lineBreak: false });
  y += 16;

  engine.ensureSpace(HEADER_HEIGHT + MIN_ROW_HEIGHT + 20);
  y = engine.getY();
  y = drawTableHeader(engine, y);

  const _currentX = margin.left;
  let rowNumber = 0;

  for (const item of data.items) {
    const rowData = getRowData(item, data.currency);
    const rowHeight = measureRowHeight(engine, rowData);

    engine.ensureSpace(rowHeight + 4);
    y = engine.getY();

    if (y + rowHeight > PAGE.height - engine.getMargin().bottom) {
      drawTableHeader(engine, y);
      y += HEADER_HEIGHT;
    }

    drawTableRow(engine, rowData, margin.left, y, rowHeight, rowNumber % 2 === 1);
    engine.drawLine(margin.left, y + rowHeight, margin.left + TABLE_WIDTH, y + rowHeight, {
      color: BRAND.tableBorder,
      width: 0.3,
    });

    y += rowHeight;
    engine.setY(y);
    rowNumber++;
  }

  drawTableBorder(engine, margin.left, y - (rowNumber > 0 ? 0 : 0), rowNumber);
  engine.moveY(8);
}

function drawTableBorder(engine: PdfEngine, x: number, y: number, _rowCount: number) {
  const doc = engine.doc;
  doc.save();
  doc
    .rect(x, engine.getMargin().top + 16, TABLE_WIDTH, y - engine.getMargin().top - 16 + 4)
    .lineWidth(0.5)
    .strokeColor(BRAND.darkBorder)
    .stroke();
  doc.restore();

  let colX = x;
  for (const col of COLUMNS) {
    engine.drawLine(colX, engine.getMargin().top + 16, colX, y + 4, {
      color: BRAND.tableBorder,
      width: 0.3,
    });
    colX += col.width;
  }
  engine.drawLine(colX, engine.getMargin().top + 16, colX, y + 4, {
    color: BRAND.tableBorder,
    width: 0.3,
  });
}
