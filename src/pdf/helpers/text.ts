import { FONTS } from './colors';
import PDFDocument from 'pdfkit';

/**
 * Word-wrap a string into lines that fit within maxWidth using the given font.
 */
export function wrapText(
  doc: any,
  text: string,
  font: string,
  fontSize: number,
  maxWidth: number,
): string[] {
  if (!text) return [''];
  const words = String(text).split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? currentLine + ' ' + word : word;
    const width = doc.font(font).fontSize(fontSize).widthOfString(candidate);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
}

/**
 * Height in points for a text block (wrapped) at the given line height.
 */
export function measureBlock(
  doc: any,
  text: string,
  font: string,
  fontSize: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = wrapText(doc, text, font, fontSize, maxWidth);
  return Math.max(lines.length, 1) * lineHeight;
}

/**
 * Draw a wrapped text block line-by-line at (x, y). Returns the y after the
 * last line so callers can stack blocks manually.
 */
export function drawWrappedText(
  doc: any,
  text: string,
  x: number,
  y: number,
  font: string,
  fontSize: number,
  maxWidth: number,
  lineHeight: number,
  color: string,
): number {
  const lines = wrapText(doc, text, font, fontSize, maxWidth);
  let cursor = y;
  doc.font(font).fontSize(fontSize).fillColor(color);
  for (const line of lines) {
    doc.text(line, x, cursor, { width: maxWidth, lineBreak: false });
    cursor += lineHeight;
  }
  return cursor;
}

/**
 * Draw an aligned single line (or wrapped lines) inside a fixed cell.
 * Returns the y after the last drawn line.
 */
export function drawCell(
  doc: any,
  text: string,
  x: number,
  y: number,
  cellWidth: number,
  font: string,
  fontSize: number,
  lineHeight: number,
  align: 'left' | 'center' | 'right',
  color: string,
  padding = 0,
): number {
  const lines = wrapText(doc, text, font, fontSize, cellWidth - padding * 2);
  let cursor = y;
  doc.font(font).fontSize(fontSize).fillColor(color);
  for (const line of lines) {
    const textWidth = doc.widthOfString(line);
    let tx = x + padding;
    if (align === 'center') tx = x + (cellWidth - textWidth) / 2;
    if (align === 'right') tx = x + cellWidth - textWidth - padding;
    doc.text(line, tx, cursor, { lineBreak: false });
    cursor += lineHeight;
  }
  return cursor;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export { FONTS };
