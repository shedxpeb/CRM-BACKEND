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

const BLOCK_HEADER_HEIGHT = 24;
const BLOCK_PADDING = 10;
const LINE_HEIGHT = 12.5;

function renderAddressBlock(
  engine: PdfEngine,
  block: AddressBlock,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const doc = engine.doc;

  // Panel body
  doc.save();
  doc
    .rect(x, y, width, height)
    .lineWidth(0.5)
    .fillAndStroke('#ffffff', BRAND.darkBorder);
  doc.restore();

  // Header strip
  doc.save();
  doc.rect(x, y, width, BLOCK_HEADER_HEIGHT).fill(BRAND.primary);
  doc.restore();

  doc.font(FONTS.bold).fontSize(9.5).fillColor(BRAND.white);
  doc.text(block.title, x + BLOCK_PADDING, y + BLOCK_HEADER_HEIGHT / 2 - 4, {
    width: width - BLOCK_PADDING * 2,
    lineBreak: false,
  });

  const contentLines = block.lines.length ? block.lines : [''];
  let currentY = y + BLOCK_HEADER_HEIGHT + 9;

  for (const line of contentLines) {
    const wrapped = wrapText(doc, line, FONTS.regular, 8.5, width - BLOCK_PADDING * 2);
    for (const wrappedLine of wrapped) {
      if (!wrappedLine) continue;
      doc.font(FONTS.regular).fontSize(8.5).fillColor(BRAND.black);
      doc.text(wrappedLine, x + BLOCK_PADDING, currentY, {
        width: width - BLOCK_PADDING * 2,
        lineBreak: false,
      });
      currentY += LINE_HEIGHT;
    }
  }
}

export function renderAddresses(engine: PdfEngine, data: AddressData) {
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  let y = engine.getY();

  const GAP = 15;
  const colWidth = (cw - GAP) / 2;
  const blockHeight = 105; // Fixed height for equal blocks

  const col1 = margin.left;
  const col2 = margin.left + colWidth + GAP;

  engine.ensureSpace(blockHeight + 15);
  y = engine.getY();

  renderAddressBlock(engine, data.buyer, col1, y, colWidth, blockHeight);
  renderAddressBlock(engine, data.supplier, col2, y, colWidth, blockHeight);

  engine.setY(y + blockHeight + 15);
}
