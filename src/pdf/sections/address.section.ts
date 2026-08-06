import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS } from '../helpers/colors';
import { wrapText } from '../helpers/text';

export interface AddressBlockData {
  title: string;
  company?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

const TITLE_HEIGHT = 16;
const PADDING_X = 8;
const PADDING_TOP = 6;
const BODY_FONT = 6.4;
const BODY_LINE_H = 8.2;
const MIN_HEIGHT = 72;
const MAX_HEIGHT = 100;

export function buildAddressLines(block: AddressBlockData): string[] {
  const lines: string[] = [];
  if (block.company) lines.push(block.company);
  if (block.name) lines.push(`Attn: ${block.name}`);
  if (block.address) lines.push(block.address);
  if (block.city || block.state || block.pincode) {
    lines.push([block.city, block.state, block.pincode].filter(Boolean).join(', '));
  }
  if (block.gstin) lines.push(`GSTIN: ${block.gstin}`);
  if (block.phone) lines.push(`Ph: ${block.phone}`);
  if (block.email) lines.push(block.email);
  return lines;
}

function measureBlockHeight(engine: PdfEngine, lines: string[], boxWidth: number): number {
  const doc = engine.doc;
  let total = TITLE_HEIGHT + PADDING_TOP;
  for (const line of lines) {
    const wrapped = wrapText(doc, line, FONTS.regular, BODY_FONT, boxWidth - PADDING_X * 2);
    total += wrapped.length * BODY_LINE_H;
  }
  return Math.min(Math.max(total + 3, MIN_HEIGHT), MAX_HEIGHT);
}

function renderBlock(
  engine: PdfEngine,
  block: AddressBlockData,
  lines: string[],
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const doc = engine.doc;

  engine.drawRect(x, y, width, height, {
    strokeColor: BRAND.darkBorder,
    strokeWidth: 0.5,
  });
  engine.drawRect(x, y, width, TITLE_HEIGHT, { fillColor: BRAND.primary });

  doc.font(FONTS.bold).fontSize(7).fillColor(BRAND.white);
  doc.text(block.title, x + PADDING_X, y + TITLE_HEIGHT / 2 - 2.5, {
    width: width - PADDING_X * 2,
    lineBreak: false,
  });

  let cursor = y + TITLE_HEIGHT + PADDING_TOP;
  doc.font(FONTS.regular).fontSize(BODY_FONT).fillColor(BRAND.black);
  for (const line of lines) {
    const wrapped = wrapText(doc, line, FONTS.regular, BODY_FONT, width - PADDING_X * 2);
    for (const wLine of wrapped) {
      if (!wLine) continue;
      doc.text(wLine, x + PADDING_X, cursor, { width: width - PADDING_X * 2, lineBreak: false });
      cursor += BODY_LINE_H;
    }
  }
}

export function renderAddresses(
  engine: PdfEngine,
  buyer: AddressBlockData,
  supplier: AddressBlockData,
): number {
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  const GAP = 10;
  const colWidth = (cw - GAP) / 2;
  const col1 = margin.left;
  const col2 = margin.left + colWidth + GAP;
  const y = engine.getY();

  const buyerLines = buildAddressLines(buyer);
  const supplierLines = buildAddressLines(supplier);

  const blockHeight = Math.max(
    measureBlockHeight(engine, buyerLines, colWidth),
    measureBlockHeight(engine, supplierLines, colWidth),
  );

  renderBlock(engine, buyer, buyerLines, col1, y, colWidth, blockHeight);
  renderBlock(engine, supplier, supplierLines, col2, y, colWidth, blockHeight);

  return y + blockHeight;
}
