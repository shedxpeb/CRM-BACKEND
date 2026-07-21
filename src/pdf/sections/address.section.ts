import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS } from '../helpers/colors';

export interface AddressBlock {
  title: string;
  lines: string[];
}

export interface AddressData {
  buyer: AddressBlock;
  supplier: AddressBlock;
  shipTo?: AddressBlock;
}

function renderAddressBlock(
  engine: PdfEngine,
  block: AddressBlock,
  x: number,
  y: number,
  width: number,
): number {
  const doc = engine.doc;
  let currentY = y;

  doc.font(FONTS.bold).fontSize(8).fillColor(BRAND.primary);
  doc.text(block.title, x, currentY, { width, lineBreak: false });
  currentY += 12;

  for (const line of block.lines) {
    doc.font(FONTS.regular).fontSize(8).fillColor(BRAND.black);
    doc.text(line, x, currentY, { width, lineBreak: false });
    currentY += 11;
  }

  return currentY + 4;
}

export function renderAddresses(engine: PdfEngine, data: AddressData) {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  let y = engine.getY();

  const thirdWidth = cw / 3;
  const col1 = margin.left;
  const col2 = margin.left + thirdWidth + 8;
  const col3 = margin.left + (thirdWidth + 8) * 2;

  const maxLines = Math.max(data.buyer.lines.length, data.supplier.lines.length, data.shipTo?.lines.length || 0);
  const blockHeight = maxLines * 11 + 36;
  engine.ensureSpace(blockHeight + 10);
  y = engine.getY();

  const y1 = renderAddressBlock(engine, data.buyer, col1, y, thirdWidth);
  const y2 = renderAddressBlock(engine, data.supplier, col2, y, thirdWidth);
  const y3 = data.shipTo ? renderAddressBlock(engine, data.shipTo, col3, y, thirdWidth) : y;

  engine.setY(Math.max(y1, y2, y3) + 4);
  engine.drawLine(margin.left, engine.getY(), margin.left + cw, engine.getY(), { color: BRAND.border, width: 0.5 });
  engine.moveY(10);
}
