import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS } from '../helpers/colors';
import { wrapText } from '../helpers/text';

export interface TermsConfig {
  headerH: number;
  font: number;
  lineH: number;
  maxLines: number;
}

export const DEFAULT_TERMS_CONFIG: TermsConfig = {
  headerH: 16,
  font: 6.5,
  lineH: 8.2,
  maxLines: 7,
};

export const COMPACT_TERMS_CONFIG: TermsConfig = {
  headerH: 14,
  font: 6.2,
  lineH: 7.5,
  maxLines: 7,
};

const DEFAULT_TERMS = [
  '1. All goods must conform to the specifications and quality standards as agreed upon.',
  '2. Delivery must be made on or before the agreed delivery date.',
  '3. Invoice must be submitted along with delivery challan and quality certificates.',
  '4. Payment will be processed as per the agreed payment terms after successful delivery.',
  '5. GST will be charged as applicable and must be clearly mentioned on the invoice.',
  '6. Any disputes arising shall be subject to the jurisdiction of local courts.',
];

export function measureTerms(
  engine: PdfEngine,
  terms: string,
  cfg: TermsConfig,
): number {
  const doc = engine.doc;
  const cw = engine.getContentWidth();
  const lines = wrapText(doc, terms, FONTS.regular, cfg.font, cw - 24);
  const count = Math.min(lines.length, cfg.maxLines);
  return cfg.headerH + count * cfg.lineH + 5;
}

export function renderTerms(engine: PdfEngine, terms: string, cfg: TermsConfig): number {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  const y = engine.getY();

  engine.drawRect(margin.left, y, cw, cfg.headerH, { fillColor: BRAND.primary });
  doc.font(FONTS.bold).fontSize(7).fillColor(BRAND.white);
  doc.text('TERMS & CONDITIONS', margin.left + 10, y + cfg.headerH / 2 - 2.5, {
    lineBreak: false,
  });

  const lines = wrapText(doc, terms, FONTS.regular, cfg.font, cw - 24);
  let cursor = y + cfg.headerH + 3;
  doc.font(FONTS.regular).fontSize(cfg.font).fillColor(BRAND.black);
  for (let i = 0; i < lines.length && i < cfg.maxLines; i++) {
    doc.text(lines[i], margin.left + 10, cursor, { width: cw - 20, lineBreak: false });
    cursor += cfg.lineH;
  }

  return cursor + 2;
}
