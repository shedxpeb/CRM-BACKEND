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
  { header: 'No.', key: 'sno', width: 30, align: 'center' },
  { header: 'Product Description', key: 'itemName', width: 170, align: 'left' },
  { header: 'HSN', key: 'hsnCode', width: 50, align: 'center' },
  { header: 'Qty', key: 'quantity', width: 45, align: 'center' },
  { header: 'Unit', key: 'unit', width: 35, align: 'center' },
  { header: 'Unit Price', key: 'rate', width: 65, align: 'right' },
  { header: 'Disc.', key: 'discount', width: 50, align: 'right' },
  { header: 'GST %', key: 'gstRate', width: 45, align: 'center' },
  { header: 'Amount', key: 'total', width: 70, align: 'right' },
];

const ROW_PADDING = 6;
const HEADER_HEIGHT = 24;
const MIN_ROW_HEIGHT = 26;
const FONT_SIZE = 7.5;
const HEADER_FONT_SIZE = 7;

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
  doc.rect(margin.left, y, tableWidth, HEADER_HEIGHT).fill(BRAND.sectionHeaderBg);
  doc.restore();

  doc.font(FONTS.bold).fontSize(HEADER_FONT_SIZE).fillColor(BRAND.sectionHeaderText);

  let currentX = margin.left;
  for (const col of COLUMNS) {
    const textW = doc.widthOfString(col.header);
    const textX =
      col.align === 'right'
        ? currentX + col.width - textW - 4
        : col.align === 'center'
          ? currentX + (col.width - textW) / 2
          : currentX + 4;
    doc.text(col.header, textX, y + 8, { width: col.width - 8, lineBreak: false });
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
        doc.text(line, currentX + col.width - textW - 4, textY, {
          width: col.width - 8,
          lineBreak: false,
        });
      } else if (col.align === 'center') {
        doc.text(line, currentX + (col.width - textW) / 2, textY, {
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

function drawTableBorders(
  engine: PdfEngine,
  tableWidth: number,
  tableStartY: number,
  tableEndY: number,
): void {
  const doc = engine.doc;
  const margin = engine.getMargin();

  doc.save();
  doc
    .rect(margin.left, tableStartY, tableWidth, tableEndY - tableStartY)
    .lineWidth(0.5)
    .strokeColor(BRAND.darkBorder)
    .stroke();
  doc.restore();

  let colX = margin.left;
  for (const col of COLUMNS) {
    engine.drawLine(colX, tableStartY, colX, tableEndY, {
      color: BRAND.tableBorder,
      width: 0.3,
    });
    colX += col.width;
  }
  engine.drawLine(colX, tableStartY, colX, tableEndY, {
    color: BRAND.tableBorder,
    width: 0.3,
  });
}

export function renderItemsTable(engine: PdfEngine, data: ItemsTableData) {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  const tableWidth = getTableWidth();
  let y = engine.getY();

  doc.save();
  doc.rect(margin.left, y, cw, 22).fill(BRAND.sectionHeaderBg);
  doc.restore();

  doc.font(FONTS.bold).fontSize(9).fillColor(BRAND.sectionHeaderText);
  doc.text('ITEM DETAILS', margin.left + 8, y + 7, { lineBreak: false });
  y += 28;

  engine.ensureSpace(HEADER_HEIGHT + MIN_ROW_HEIGHT + 20);
  y = engine.getY();

  const tableStartY = y;
  y = drawTableHeader(engine, tableWidth, y);

  let rowNumber = 0;

  for (const item of data.items) {
    const rowData = getRowData(item, data.currency);
    const rowHeight = measureRowHeight(engine, rowData);

    engine.ensureSpace(rowHeight + 4);
    y = engine.getY();

    if (y + rowHeight > PAGE.height - engine.getMargin().bottom) {
      y = drawTableHeader(engine, tableWidth, y);
    }

    drawTableRow(engine, rowData, margin.left, y, rowHeight, rowNumber % 2 === 1, tableWidth);
    engine.drawLine(margin.left, y + rowHeight, margin.left + tableWidth, y + rowHeight, {
      color: BRAND.tableBorder,
      width: 0.3,
    });

    y += rowHeight;
    engine.setY(y);
    rowNumber++;
  }

  drawTableBorders(engine, tableWidth, tableStartY, y);
  engine.moveY(8);
}
