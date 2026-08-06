import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS } from '../helpers/colors';

export interface HeaderData {
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyGstin?: string;
  poNumber: string;
  poDate: string;
  revision?: number | string;
  status?: string;
}

const HEADER_HEIGHT = 68;
const RIGHT_COL_WIDTH = 140;

function buildCompanyLines(data: HeaderData): string[] {
  const lines: string[] = [];
  if (data.companyAddress) lines.push(data.companyAddress);
  const contact: string[] = [];
  if (data.companyPhone) contact.push(data.companyPhone);
  if (data.companyEmail) contact.push(data.companyEmail);
  if (contact.length) lines.push(contact.join('  ·  '));
  if (data.companyWebsite) lines.push(data.companyWebsite);
  if (data.companyGstin) lines.push(`GSTIN: ${data.companyGstin}`);
  return lines;
}

export function renderHeader(engine: PdfEngine, data: HeaderData): number {
  const doc = engine.doc;
  const margin = engine.getMargin();
  const cw = engine.getContentWidth();
  const x0 = margin.left;
  const y = engine.getY();

  const rightX = x0 + cw - RIGHT_COL_WIDTH;

  // ── Left: logo + company identity ───────────────────────
  let textX = x0;
  const logo = engine.loadLogo();
  let logoBlockW = 0;
  if (logo) {
    try {
      const logoH = 34;
      doc.image(logo, x0, y + 8, { height: logoH });
      logoBlockW = logoH * 1.7; // approx proportional width
      textX = x0 + logoBlockW + 12;
    } catch {
      // Ignore logo loading errors
    }
  }

  const leftWidth = rightX - textX - 14;

  doc.font(FONTS.bold).fontSize(13).fillColor(BRAND.primary);
  doc.text(data.companyName || 'PEB Systems', textX, y + 12, {
    width: leftWidth,
    lineBreak: false,
  });

  const companyLines = buildCompanyLines(data);
  let cy = y + 26;
  doc.font(FONTS.regular).fontSize(6.4).fillColor(BRAND.muted);
  for (const line of companyLines) {
    doc.text(line, textX, cy, { width: leftWidth, lineBreak: false });
    cy += 8.2;
  }

  // ── Right: document title + PO meta box ─────────────────
  doc.font(FONTS.bold).fontSize(13).fillColor(BRAND.primary);
  doc.text('PURCHASE ORDER', rightX, y, {
    width: RIGHT_COL_WIDTH,
    align: 'right',
    lineBreak: false,
  });

  const metaRows: { label: string; value: string }[] = [
    { label: 'PO Number', value: data.poNumber },
    { label: 'Date', value: data.poDate },
    {
      label: 'Revision',
      value: data.revision !== undefined && data.revision !== null ? String(data.revision) : '-',
    },
    { label: 'Status', value: data.status || '-' },
  ];

  const boxY = y + 18;
  const boxH = 42;
  engine.drawRect(rightX, boxY, RIGHT_COL_WIDTH, boxH, {
    strokeColor: BRAND.darkBorder,
    strokeWidth: 0.5,
  });

  metaRows.forEach((row, i) => {
    const rowY = boxY + i * (boxH / metaRows.length);
    if (i > 0) {
      engine.drawLine(rightX + 5, rowY, rightX + RIGHT_COL_WIDTH - 5, rowY, {
        color: BRAND.border,
        width: 0.4,
      });
    }
    doc.font(FONTS.bold).fontSize(5.2).fillColor(BRAND.muted);
    doc.text(row.label.toUpperCase(), rightX + 8, rowY + 1.5, {
      width: RIGHT_COL_WIDTH - 16,
      lineBreak: false,
    });
    doc.font(FONTS.bold).fontSize(6.8).fillColor(BRAND.black);
    doc.text(row.value, rightX + 8, rowY + 8, {
      width: RIGHT_COL_WIDTH - 16,
      lineBreak: false,
    });
  });

  // ── Bottom accent rule ──────────────────────────────────
  engine.drawLine(x0, y + HEADER_HEIGHT - 2, x0 + cw, y + HEADER_HEIGHT - 2, {
    color: BRAND.primary,
    width: 1.4,
  });

  return y + HEADER_HEIGHT;
}
