import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS } from '../helpers/colors';

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

export function renderTerms(engine: PdfEngine, data: TermsData) {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  let y = engine.getY();

  const termsText = data.terms || DEFAULT_TERMS.join('\n');

  engine.ensureSpace(60);
  y = engine.getY();

  doc.save();
  doc.rect(margin.left, y, cw, 22).fill(BRAND.sectionHeaderBg);
  doc.restore();

  doc.font(FONTS.bold).fontSize(9).fillColor(BRAND.sectionHeaderText);
  doc.text('TERMS & CONDITIONS', margin.left + 8, y + 7, { lineBreak: false });
  y += 30;

  doc.font(FONTS.regular).fontSize(7).fillColor(BRAND.black);
  const lines = termsText.split('\n');
  for (const line of lines) {
    if (line.trim()) {
      const trimmed = line.trim();
      const lineHeight = doc.heightOfString(trimmed, { width: cw - 16 });
      doc.text(trimmed, margin.left + 8, y, { width: cw - 16, lineBreak: false });
      y += lineHeight + 3;
    }
  }

  if (data.notes) {
    y += 6;
    doc.save();
    doc.rect(margin.left, y, cw, 18).fill(BRAND.sectionHeaderBg);
    doc.restore();

    doc.font(FONTS.bold).fontSize(8).fillColor(BRAND.sectionHeaderText);
    doc.text('NOTES', margin.left + 8, y + 5, { lineBreak: false });
    y += 24;

    doc.font(FONTS.regular).fontSize(7).fillColor(BRAND.black);
    const notesHeight = doc.heightOfString(data.notes, { width: cw - 16 });
    doc.text(data.notes, margin.left + 8, y, { width: cw - 16, lineBreak: false });
    y += notesHeight + 4;
  }

  engine.setY(y + 8);
}
