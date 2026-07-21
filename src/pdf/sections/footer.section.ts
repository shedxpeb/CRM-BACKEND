import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS, PAGE } from '../helpers/colors';

export interface FooterData {
  companyName?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
}

export function renderFooter(engine: PdfEngine, data?: FooterData) {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  const footerY = PAGE.height - 45;

  engine.drawLine(margin.left, footerY - 6, margin.left + cw, footerY - 6, { color: BRAND.border, width: 0.5 });

  const companyName = data?.companyName || 'PEB Systems';
  const details: string[] = [];
  if (data?.gstin) details.push(`GSTIN: ${data.gstin}`);
  if (data?.phone) details.push(`Phone: ${data.phone}`);
  if (data?.email) details.push(`Email: ${data.email}`);
  if (data?.website) details.push(`Web: ${data.website}`);

  doc.font(FONTS.bold).fontSize(7).fillColor(BRAND.muted);
  doc.text(companyName, margin.left, footerY, { width: cw * 0.5, lineBreak: false });

  if (details.length > 0) {
    doc.font(FONTS.regular).fontSize(6.5).fillColor(BRAND.muted);
    doc.text(details.join('  |  '), margin.left + cw * 0.5, footerY, {
      width: cw * 0.5,
      align: 'right',
      lineBreak: false,
    });
  }

  doc.font(FONTS.italic).fontSize(6).fillColor(BRAND.muted);
  doc.text('Generated automatically by PEB CRM', margin.left, footerY + 12, {
    width: cw,
    align: 'center',
    lineBreak: false,
  });
}
