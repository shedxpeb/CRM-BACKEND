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
  const footerY = PAGE.height - 65;

  engine.drawLine(margin.left, footerY - 6, margin.left + cw, footerY - 6, {
    color: BRAND.primary,
    width: 1,
  });

  const sigWidth = cw / 3 - 10;

  const sigLabels = [
    { label: 'Prepared By', x: margin.left },
    { label: 'Authorized By', x: margin.left + sigWidth + 15 },
    { label: 'Vendor Signature', x: margin.left + (sigWidth + 15) * 2 },
  ];

  for (const sig of sigLabels) {
    doc.font(FONTS.bold).fontSize(7).fillColor(BRAND.muted);
    doc.text(sig.label, sig.x, footerY, { width: sigWidth, lineBreak: false });

    doc.save();
    doc
      .moveTo(sig.x, footerY + 18)
      .lineTo(sig.x + sigWidth, footerY + 18)
      .lineWidth(0.5)
      .strokeColor(BRAND.border)
      .stroke();
    doc.restore();
  }

  const companyName = data?.companyName || 'PEB Systems';
  const details: string[] = [];
  if (data?.gstin) details.push(`GSTIN: ${data.gstin}`);
  if (data?.phone) details.push(`Phone: ${data.phone}`);
  if (data?.email) details.push(`Email: ${data.email}`);

  const bottomY = footerY + 35;

  doc.font(FONTS.bold).fontSize(7).fillColor(BRAND.muted);
  doc.text(companyName, margin.left, bottomY, { width: cw * 0.5, lineBreak: false });

  if (details.length > 0) {
    doc.font(FONTS.regular).fontSize(6.5).fillColor(BRAND.muted);
    doc.text(details.join('  |  '), margin.left + cw * 0.5, bottomY, {
      width: cw * 0.5,
      align: 'right',
      lineBreak: false,
    });
  }

  doc.font(FONTS.italic).fontSize(6).fillColor(BRAND.muted);
  doc.text('This is a computer-generated document.', margin.left, bottomY + 12, {
    width: cw,
    align: 'center',
    lineBreak: false,
  });
}
