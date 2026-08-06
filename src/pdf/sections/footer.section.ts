import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS, PAGE } from '../helpers/colors';

export interface FooterData {
  companyName?: string;
}

export function renderFooter(
  engine: PdfEngine,
  data?: FooterData,
  pageNum = 1,
  totalPages = 1,
  generatedAt?: string,
) {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();

  const ruleY = PAGE.height - 30;
  const infoY = ruleY + 8;

  engine.drawLine(margin.left, ruleY, margin.left + cw, ruleY, {
    color: BRAND.primary,
    width: 1,
  });

  const dateStr = generatedAt || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.font(FONTS.italic).fontSize(5.6).fillColor(BRAND.muted);
  doc.text(`Computer Generated Document  ·  Generated on ${dateStr}`, margin.left, infoY, {
    width: cw * 0.62,
    lineBreak: false,
  });
  doc.font(FONTS.regular).fontSize(5.6).fillColor(BRAND.muted);
  doc.text(`Page ${pageNum} of ${totalPages}`, margin.left + cw * 0.62, infoY, {
    width: cw * 0.38,
    align: 'right',
    lineBreak: false,
  });

  // ── Company name strip at very bottom ───────────────────
  const bottomY = infoY + 11;
  doc.font(FONTS.bold).fontSize(5.6).fillColor(BRAND.muted);
  doc.text(data?.companyName || 'PEB Systems', margin.left, bottomY, {
    width: cw,
    align: 'center',
    lineBreak: false,
  });
}

export function renderSimpleFooter(
  engine: PdfEngine,
  pageNum = 1,
  totalPages = 1,
  generatedAt?: string,
) {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();

  const ruleY = PAGE.height - 30;
  const infoY = ruleY + 8;

  engine.drawLine(margin.left, ruleY, margin.left + cw, ruleY, {
    color: BRAND.border,
    width: 0.5,
  });

  const dateStr = generatedAt || new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.font(FONTS.italic).fontSize(5.6).fillColor(BRAND.muted);
  doc.text(`Computer Generated Document  ·  Generated on ${dateStr}`, margin.left, infoY, {
    width: cw * 0.62,
    lineBreak: false,
  });
  doc.font(FONTS.regular).fontSize(5.6).fillColor(BRAND.muted);
  doc.text(`Page ${pageNum} of ${totalPages}`, margin.left + cw * 0.62, infoY, {
    width: cw * 0.38,
    align: 'right',
    lineBreak: false,
  });
}
