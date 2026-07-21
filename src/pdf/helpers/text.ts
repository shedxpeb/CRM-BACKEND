import PDFDocument from 'pdfkit';

export function wrapText(
  doc: PDFKit.PDFDocument,
  text: string,
  font: string,
  fontSize: number,
  maxWidth: number,
): string[] {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const width = doc.font(font).fontSize(fontSize).widthOfString(testLine);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
}

export function measureRowHeight(
  doc: PDFKit.PDFDocument,
  texts: string[],
  fonts: string[],
  fontSizes: number[],
  maxWidths: number[],
): number {
  let maxHeight = 0;
  for (let i = 0; i < texts.length; i++) {
    const lines = wrapText(doc, texts[i] || '', fonts[i], fontSizes[i], maxWidths[i]);
    const height = lines.length * (fontSizes[i] + 4);
    if (height > maxHeight) maxHeight = height;
  }
  return Math.max(maxHeight + 8, 20);
}

export function drawWrappedText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  font: string,
  fontSize: number,
  maxWidth: number,
  color?: string,
): number {
  const lines = wrapText(doc, text, font, fontSize, maxWidth);
  doc.font(font).fontSize(fontSize);
  if (color) doc.fillColor(color);
  let currentY = y;
  for (const line of lines) {
    doc.text(line, x, currentY, { width: maxWidth, lineBreak: false });
    currentY += fontSize + 4;
  }
  return currentY;
}

export function drawLabelValue(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  labelWidth: number,
  valueWidth: number,
  options?: { labelFontSize?: number; valueFontSize?: number; valueColor?: string },
): number {
  const lf = options?.labelFontSize || 8;
  const vf = options?.valueFontSize || 8;
  doc.font('Calibri-Bold').fontSize(lf).fillColor('#718096');
  doc.text(label, x, y, { width: labelWidth, lineBreak: false });
  doc.font('Calibri').fontSize(vf).fillColor(options?.valueColor || '#1a202c');
  doc.text(value || '-', x + labelWidth, y, { width: valueWidth, lineBreak: false });
  return y + vf + 6;
}
