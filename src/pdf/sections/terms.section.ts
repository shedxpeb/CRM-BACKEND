import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS, PAGE } from '../helpers/colors';

export interface TermsData {
  terms?: string;
  notes?: string;
  internalNotes?: string;
}

const DEFAULT_TERMS = [
  '1. All goods must conform to the specifications and quality standards as agreed upon.',
  '2. Delivery must be made on or before the agreed delivery date.',
  '3. Invoice must be submitted along with delivery challan and quality certificates.',
  '4. Payment will be processed as per the agreed payment terms after successful delivery.',
  '5. Any disputes arising shall be subject to the jurisdiction of local courts.',
  "6. Goods found defective or not meeting specifications will be returned at supplier's risk and cost.",
  '7. GST will be charged as applicable and must be clearly mentioned on the invoice.',
];

const PANEL_HEADER_HEIGHT = 26;
const PANEL_PADDING = 12;

function renderPanel(engine: PdfEngine, title: string, body: string): number {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  const bodyWidth = cw - PANEL_PADDING * 2;

  engine.ensureSpace(PANEL_HEADER_HEIGHT + 24);
  let y = engine.getY();

  // Header strip
  doc.save();
  doc.rect(margin.left, y, cw, PANEL_HEADER_HEIGHT).fill(BRAND.primary);
  doc.restore();

  doc.font(FONTS.bold).fontSize(9.5).fillColor(BRAND.white);
  doc.text(title, margin.left + PANEL_PADDING, y + 9, { lineBreak: false });
  y += PANEL_HEADER_HEIGHT;

  const lines = body.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const lineHeight = doc.heightOfString(line, { width: bodyWidth });
    if (y + lineHeight > PAGE.height - margin.bottom) {
      engine.ensureSpace(lineHeight + 4);
      y = engine.getY();
    }

    doc.font(FONTS.regular).fontSize(8.5).fillColor(BRAND.black);
    doc.text(line, margin.left + PANEL_PADDING, y, { width: bodyWidth });
    y += lineHeight + 3;
  }

  return y + 10;
}

export function renderTerms(engine: PdfEngine, data: TermsData) {
  let y = engine.getY();

  if (data.notes) {
    y = renderPanel(engine, 'NOTES', data.notes);
    engine.setY(y);
  }

  const termsText = data.terms || DEFAULT_TERMS.join('\n');
  y = renderPanel(engine, 'TERMS & CONDITIONS', termsText);

  engine.setY(y);
}
