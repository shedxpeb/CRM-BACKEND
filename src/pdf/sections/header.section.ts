import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS } from '../helpers/colors';

export interface HeaderData {
  poNumber: string;
  poDate: string;
  paymentTerms?: string;
  expectedDelivery?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyGstin?: string;
}

export function renderHeader(engine: PdfEngine, data: HeaderData) {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  let y = margin.top;

  const leftColWidth = cw * 0.55;
  const rightColWidth = cw * 0.45;

  const logo = engine.loadLogo();
  let logoHeight = 0;
  if (logo) {
    try {
      doc.image(logo, margin.left, y, { width: 60, height: 50 });
      logoHeight = 50;
    } catch {
      // Ignore logo loading errors
    }
  }

  const titleY = y + (logoHeight > 0 ? 5 : 0);
  doc.font(FONTS.bold).fontSize(22).fillColor(BRAND.primary);
  doc.text('PURCHASE ORDER', margin.left + leftColWidth - 50, titleY, {
    width: rightColWidth + 50,
    align: 'right',
  });

  y += Math.max(logoHeight, 30) + 10;

  let infoY = margin.top + 2;
  if (data.companyName) {
    doc.font(FONTS.bold).fontSize(10).fillColor(BRAND.primary);
    doc.text(data.companyName, margin.left, infoY, { width: leftColWidth, lineBreak: false });
    infoY += 14;
  }

  doc.font(FONTS.regular).fontSize(8).fillColor(BRAND.black);
  if (data.companyAddress) {
    doc.text(data.companyAddress, margin.left, infoY, { width: leftColWidth, lineBreak: false });
    infoY += 11;
  }
  if (data.companyPhone) {
    doc.text(`Phone: ${data.companyPhone}`, margin.left, infoY, {
      width: leftColWidth,
      lineBreak: false,
    });
    infoY += 11;
  }
  if (data.companyEmail) {
    doc.text(`Email: ${data.companyEmail}`, margin.left, infoY, {
      width: leftColWidth,
      lineBreak: false,
    });
    infoY += 11;
  }
  if (data.companyGstin) {
    doc.text(`GSTIN: ${data.companyGstin}`, margin.left, infoY, {
      width: leftColWidth,
      lineBreak: false,
    });
    infoY += 11;
  }

  y = Math.max(y, infoY) + 8;

  engine.drawLine(margin.left, y, margin.left + cw, y, { color: BRAND.primary, width: 1.5 });
  y += 10;

  const labelW = 80;
  const valueW = cw * 0.5 - labelW;

  doc.font(FONTS.bold).fontSize(8).fillColor(BRAND.muted);
  doc.text('PO Number:', margin.left, y, { width: labelW, lineBreak: false });
  doc.font(FONTS.regular).fontSize(9).fillColor(BRAND.black);
  doc.text(data.poNumber, margin.left + labelW, y, { width: valueW, lineBreak: false });

  doc.font(FONTS.bold).fontSize(8).fillColor(BRAND.muted);
  doc.text('Date:', margin.left + cw * 0.5, y, { width: labelW, lineBreak: false });
  doc.font(FONTS.regular).fontSize(9).fillColor(BRAND.black);
  doc.text(data.poDate, margin.left + cw * 0.5 + labelW, y, { width: valueW, lineBreak: false });

  y += 16;

  if (data.paymentTerms) {
    doc.font(FONTS.bold).fontSize(8).fillColor(BRAND.muted);
    doc.text('Payment Terms:', margin.left, y, { width: labelW, lineBreak: false });
    doc.font(FONTS.regular).fontSize(9).fillColor(BRAND.black);
    doc.text(data.paymentTerms, margin.left + labelW, y, { width: cw - labelW, lineBreak: false });
    y += 14;
  }

  if (data.expectedDelivery) {
    doc.font(FONTS.bold).fontSize(8).fillColor(BRAND.muted);
    doc.text('Expected Delivery:', margin.left, y, { width: labelW, lineBreak: false });
    doc.font(FONTS.regular).fontSize(9).fillColor(BRAND.black);
    doc.text(data.expectedDelivery, margin.left + labelW, y, {
      width: cw - labelW,
      lineBreak: false,
    });
    y += 14;
  }

  y += 4;
  engine.drawLine(margin.left, y, margin.left + cw, y, { color: BRAND.border, width: 0.5 });
  y += 8;

  engine.setY(y);
}
