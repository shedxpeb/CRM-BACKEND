import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS } from '../helpers/colors';
import { wrapText } from '../helpers/text';

export interface AddressBlock {
  title: string;
  lines: string[];
}

export interface AddressData {
  buyer: AddressBlock;
  supplier: AddressBlock;
  shipTo?: AddressBlock;
}

function measureBlockHeight(engine: PdfEngine, block: AddressBlock, width: number): number {
  const doc = engine.doc;
  let height = 20;
  for (const line of block.lines) {
    const lines = wrapText(doc, line, FONTS.regular, 8, width - 20);
    height += lines.length * 12;
  }
  return height + 10;
}

function renderAddressBlock(
  engine: PdfEngine,
  block: AddressBlock,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const doc = engine.doc;
  const padding = 10;

  doc.save();
  doc.rect(x, y, width, height).lineWidth(0.5).fillAndStroke(BRAND.panelBg, BRAND.panelBorder);
  doc.restore();

  doc.save();
  doc.rect(x, y, width, 20).fill(BRAND.panelHeaderBg);
  doc.restore();

  doc.font(FONTS.bold).fontSize(9).fillColor(BRAND.panelHeaderText);
  doc.text(block.title, x + padding, y + 6, { width: width - padding * 2, lineBreak: false });

  let currentY = y + 25;

  for (const line of block.lines) {
    doc.font(FONTS.regular).fontSize(8).fillColor(BRAND.black);
    const lines = wrapText(doc, line, FONTS.regular, 8, width - padding * 2);
    for (const wrappedLine of lines) {
      doc.text(wrappedLine, x + padding, currentY, {
        width: width - padding * 2,
        lineBreak: false,
      });
      currentY += 12;
    }
  }
}

export function renderAddresses(engine: PdfEngine, data: AddressData) {
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  let y = engine.getY();

  const GAP = 15;
  const colWidth = (cw - GAP) / 2;

  const col1 = margin.left;
  const col2 = margin.left + colWidth + GAP;

  const h1 = measureBlockHeight(engine, data.buyer, colWidth);
  const h2 = measureBlockHeight(engine, data.supplier, colWidth);
  const maxH = Math.max(h1, h2);

  engine.ensureSpace(maxH + 10);
  y = engine.getY();

  renderAddressBlock(engine, data.buyer, col1, y, colWidth, maxH);
  renderAddressBlock(engine, data.supplier, col2, y, colWidth, maxH);

  engine.setY(y + maxH + 10);
}
