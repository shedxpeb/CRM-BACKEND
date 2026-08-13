import { PdfEngine } from '../engine/pdf-engine';
import { BRAND, FONTS, PAGE } from '../helpers/colors';
import { SectionDimensions } from './layout-engine';
import { wrapText } from '../helpers/text';
import { formatCurrency, numberToWords } from '../helpers/currency';
import PDFDocument from 'pdfkit';

export interface HeaderData {
  companyName: string;
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

export interface OrderInfoData {
  paymentTerms?: string;
  expectedDelivery?: string;
  currency?: string;
  projectName?: string;
  warehouseName?: string;
}

export interface AddressData {
  title: string;
  company?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

export interface TableData {
  items: Array<{
    sno: number;
    name: string;
    description?: string;
    hsn?: string;
    quantity: number;
    unit: string;
    rate: number;
    discount?: number;
    discountType?: string;
    gstRate?: number;
    amount: number;
  }>;
  currency: string;
}

export interface SummaryData {
  subtotal: number;
  discount?: number;
  discountType?: string;
  cgst: number;
  sgst: number;
  igst: number;
  packing?: number;
  freight?: number;
  transport?: number;
  other?: number;
  roundOff?: number;
  grandTotal: number;
  currency?: string;
}

export interface TermsData {
  terms?: string;
}

export interface SignatureData {
  companyName?: string;
}

export interface FooterData {
  companyName?: string;
  generatedAt: string;
  pageNum: number;
  totalPages: number;
}

export class SectionRenderer {
  constructor(private engine: PdfEngine) {
    console.log('SECTION RENDERER - Initialized');
  }

  measureHeader(data: HeaderData): SectionDimensions {
    const _doc = this.engine.doc;
    const _cw = this.engine.getContentWidth();

    const logoHeight = 35;
    const companyLines = this.buildCompanyLines(data);
    const companyHeight = 14 + companyLines.length * 9;

    const metaBoxHeight = 44;
    const totalHeight = Math.max(logoHeight, companyHeight) + 4 + 14 + metaBoxHeight + 4;

    return {
      height: totalHeight,
      minHeight: totalHeight,
      preferredHeight: totalHeight,
      maxHeight: totalHeight,
    };
  }

  renderHeader(_data: HeaderData, _y: number): number {
    const doc = this.engine.doc;
    const margin = this.engine.getMargin();
    const cw = this.engine.getContentWidth();
    const x0 = margin.left;

    const rightColWidth = 200;
    const rightX = x0 + cw - rightColWidth;

    let textX = x0;
    const logo = this.engine.loadLogo();
    if (logo) {
      try {
        doc.image(logo, x0, _y + 2, { height: 35 });
        textX = x0 + 42;
      } catch {
        // Logo loading failed, continue without logo
      }
    }

    const leftWidth = rightX - textX - 14;

    doc.font(FONTS.bold).fontSize(12).fillColor(BRAND.primary);
    doc.text(_data.companyName || 'PEB Systems', textX, _y + 2, {
      width: leftWidth,
      lineBreak: false,
    });

    const companyLines = this.buildCompanyLines(_data);
    let cy = _y + 16;
    doc.font(FONTS.regular).fontSize(6.4).fillColor(BRAND.muted);
    for (const line of companyLines) {
      doc.text(line, textX, cy, { width: leftWidth, lineBreak: false });
      cy += 8.2;
    }

    doc.font(FONTS.bold).fontSize(12).fillColor(BRAND.primary);
    doc.text('PURCHASE ORDER', rightX, _y, {
      width: rightColWidth,
      align: 'right',
      lineBreak: false,
    });

    const metaRows = [
      { label: 'PO Number', value: _data.poNumber },
      { label: 'Date', value: _data.poDate },
      { label: 'Revision', value: _data.revision !== undefined ? String(_data.revision) : '-' },
      { label: 'Status', value: _data.status || '-' },
    ];

    const boxY = _y + 18;
    const boxH = 44;
    this.engine.drawRect(rightX, boxY, rightColWidth, boxH, {
      strokeColor: BRAND.darkBorder,
      strokeWidth: 0.5,
    });

    metaRows.forEach((row, i) => {
      const rowY = boxY + i * (boxH / metaRows.length);
      if (i > 0) {
        this.engine.drawLine(rightX + 5, rowY, rightX + rightColWidth - 5, rowY, {
          color: BRAND.border,
          width: 0.4,
        });
      }
      doc.font(FONTS.bold).fontSize(5.2).fillColor(BRAND.muted);
      doc.text(row.label.toUpperCase(), rightX + 8, rowY + 1.5, {
        width: rightColWidth - 16,
        lineBreak: false,
      });
      doc.font(FONTS.bold).fontSize(6.8).fillColor(BRAND.black);
      doc.text(row.value, rightX + 8, rowY + 8, {
        width: rightColWidth - 16,
        lineBreak: false,
      });
    });

    this.engine.drawLine(x0, _y + 66, x0 + cw, _y + 66, {
      color: BRAND.primary,
      width: 1.2,
    });

    return _y + 70;
  }

  private buildCompanyLines(_data: HeaderData): string[] {
    const lines: string[] = [];
    if (_data.companyAddress) lines.push(_data.companyAddress);
    const contact: string[] = [];
    if (_data.companyPhone) contact.push(_data.companyPhone);
    if (_data.companyEmail) contact.push(_data.companyEmail);
    if (contact.length) lines.push(contact.join('  ·  '));
    if (_data.companyWebsite) lines.push(_data.companyWebsite);
    if (_data.companyGstin) lines.push(`GSTIN: ${_data.companyGstin}`);
    return lines;
  }

  measureOrderInfo(_data: OrderInfoData): SectionDimensions {
    const fields = [
      _data.paymentTerms,
      _data.expectedDelivery,
      _data.currency,
      _data.projectName,
      _data.warehouseName,
    ].filter(Boolean);

    const height = fields.length > 0 ? 18 : 0;

    return {
      height,
      minHeight: 0,
      preferredHeight: height,
      maxHeight: height,
    };
  }

  renderOrderInfo(_data: OrderInfoData, y: number): number {
    const doc = this.engine.doc;
    const margin = this.engine.getMargin();
    const cw = this.engine.getContentWidth();

    const fields = [
      { label: 'Payment Terms', value: _data.paymentTerms },
      { label: 'Expected Delivery', value: _data.expectedDelivery },
      { label: 'Currency', value: _data.currency },
      { label: 'Project', value: _data.projectName },
      { label: 'Warehouse', value: _data.warehouseName },
    ].filter((f) => f.value);

    if (fields.length === 0) return y;

    const stripH = 18;
    this.engine.drawRect(margin.left, y, cw, stripH, {
      fillColor: BRAND.faint,
      strokeColor: BRAND.border,
      strokeWidth: 0.5,
    });

    const cellW = cw / fields.length;
    fields.forEach((cell, i) => {
      const cx = margin.left + i * cellW;
      if (i > 0) {
        this.engine.drawLine(cx + 6, y + 3, cx + 6, y + stripH - 3, {
          color: BRAND.border,
          width: 0.4,
        });
      }
      doc.font(FONTS.bold).fontSize(5.2).fillColor(BRAND.muted);
      doc.text(cell.label.toUpperCase(), cx + 8, y + 2.5, {
        width: cellW - 16,
        lineBreak: false,
      });
      doc.font(FONTS.regular).fontSize(6.4).fillColor(BRAND.black);
      const raw = cell.value || '';
      const value = raw.length > 52 ? raw.slice(0, 52) + '…' : raw;
      doc.text(value, cx + 8, y + 9, { width: cellW - 16, lineBreak: false });
    });

    return y + stripH;
  }

  measureAddress(left: AddressData, right: AddressData): SectionDimensions {
    const _doc = this.engine.doc;
    const cw = this.engine.getContentWidth();
    const _colWidth = (cw - 10) / 2;

    const leftLines = this.buildAddressLines(left);
    const rightLines = this.buildAddressLines(right);

    const leftHeight = 16 + 6 + leftLines.length * 8.2;
    const rightHeight = 16 + 6 + rightLines.length * 8.2;

    const height = Math.max(leftHeight, rightHeight, 72);

    return {
      height,
      minHeight: 72,
      preferredHeight: height,
      maxHeight: 100,
    };
  }

  renderAddress(left: AddressData, right: AddressData, y: number): number {
    const _doc = this.engine.doc;
    const margin = this.engine.getMargin();
    const cw = this.engine.getContentWidth();
    const GAP = 10;
    const colWidth = (cw - GAP) / 2;

    const leftLines = this.buildAddressLines(left);
    const rightLines = this.buildAddressLines(right);

    const leftHeight = 16 + 6 + leftLines.length * 8.2;
    const rightHeight = 16 + 6 + rightLines.length * 8.2;
    const blockHeight = Math.max(leftHeight, rightHeight, 72);

    this.renderAddressBlock(left, leftLines, margin.left, y, colWidth, blockHeight);
    this.renderAddressBlock(
      right,
      rightLines,
      margin.left + colWidth + GAP,
      y,
      colWidth,
      blockHeight,
    );

    return y + blockHeight;
  }

  private buildAddressLines(data: AddressData): string[] {
    const lines: string[] = [];
    if (data.company) lines.push(data.company);
    if (data.name) lines.push(`Attn: ${data.name}`);
    if (data.address) lines.push(data.address);
    if (data.city || data.state || data.pincode) {
      lines.push([data.city, data.state, data.pincode].filter(Boolean).join(', '));
    }
    if (data.gstin) lines.push(`GSTIN: ${data.gstin}`);
    if (data.phone) lines.push(`Ph: ${data.phone}`);
    if (data.email) lines.push(data.email);
    return lines;
  }

  private renderAddressBlock(
    data: AddressData,
    lines: string[],
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const doc = this.engine.doc;
    const TITLE_HEIGHT = 16;
    const PADDING_X = 8;
    const PADDING_TOP = 6;
    const BODY_FONT = 6.4;
    const BODY_LINE_H = 8.2;

    this.engine.drawRect(x, y, width, height, {
      strokeColor: BRAND.darkBorder,
      strokeWidth: 0.5,
    });
    this.engine.drawRect(x, y, width, TITLE_HEIGHT, { fillColor: BRAND.primary });

    doc.font(FONTS.bold).fontSize(7).fillColor(BRAND.white);
    doc.text(data.title, x + PADDING_X, y + TITLE_HEIGHT / 2 - 2.5, {
      width: width - PADDING_X * 2,
      lineBreak: false,
    });

    let cursor = y + TITLE_HEIGHT + PADDING_TOP;
    doc.font(FONTS.regular).fontSize(BODY_FONT).fillColor(BRAND.black);
    for (const line of lines) {
      const wrapped = wrapText(doc, line, FONTS.regular, BODY_FONT, width - PADDING_X * 2);
      for (const wLine of wrapped) {
        if (!wLine) continue;
        doc.text(wLine, x + PADDING_X, cursor, { width: width - PADDING_X * 2, lineBreak: false });
        cursor += BODY_LINE_H;
      }
    }
  }

  measureTable(data: TableData, startIndex: number, endIndex: number): SectionDimensions {
    const doc = this.engine.doc;
    const cw = this.engine.getContentWidth();
    const headerHeight = 18;

    let totalHeight = headerHeight;
    for (let i = startIndex; i < endIndex && i < data.items.length; i++) {
      const item = data.items[i];
      const rowHeight = this.measureRowHeight(doc, item, cw);
      totalHeight += rowHeight;
    }

    return {
      height: totalHeight,
      minHeight: headerHeight + 18,
      preferredHeight: totalHeight,
      maxHeight: totalHeight,
    };
  }

  renderTable(data: TableData, y: number, startIndex: number, endIndex: number): number {
    const _doc = this.engine.doc;
    const _margin = this.engine.getMargin();
    const cw = this.engine.getContentWidth();

    const headerHeight = 18;
    this.renderTableHeader(data.currency, y, cw);

    let currentY = y + headerHeight;
    for (let i = startIndex; i < endIndex && i < data.items.length; i++) {
      const item = data.items[i];
      const rowHeight = this.renderTableRow(item, currentY, cw, data.currency, i % 2 === 1);
      currentY += rowHeight;
    }

    this.renderTableBorders(y, currentY, cw);

    return currentY;
  }

  private measureRowHeight(
    doc: PDFDocument,
    item: TableData['items'][0],
    cw: number,
  ): number {
    const itemColWidth = Math.max(110, cw - 318);
    const nameLines = wrapText(doc, item.name, FONTS.regular, 6.8, itemColWidth - 10);
    const descLines = item.description
      ? wrapText(doc, item.description, FONTS.regular, 6.2, itemColWidth - 10)
      : [];
    const maxLines = Math.max(nameLines.length + descLines.length, 1);
    return Math.max(maxLines * 9.3 + 7, 18);
  }

  private renderTableHeader(currency: string, y: number, cw: number) {
    const doc = this.engine.doc;
    const margin = this.engine.getMargin();

    this.engine.drawRect(margin.left, y, cw, 18, { fillColor: BRAND.primary });

    const cols = this.getTableColumns(cw);
    doc.font(FONTS.bold).fontSize(6.7).fillColor(BRAND.white);

    let currentX = margin.left;
    for (const col of cols) {
      const textWidth = doc.widthOfString(col.header);
      let tx = currentX + 5;
      if (col.align === 'center') tx = currentX + (col.width - textWidth) / 2;
      if (col.align === 'right') tx = currentX + col.width - textWidth - 5;
      doc.text(col.header, tx, y + 6, { lineBreak: false });
      currentX += col.width;
    }
  }

  private renderTableRow(
    item: TableData['items'][0],
    y: number,
    cw: number,
    currency: string,
    alt: boolean,
  ): number {
    const doc = this.engine.doc;
    const margin = this.engine.getMargin();

    const rowHeight = this.measureRowHeight(doc, item, cw);
    if (alt) {
      this.engine.drawRect(margin.left, y, cw, rowHeight, { fillColor: BRAND.rowAlt });
    }

    const cols = this.getTableColumns(cw);
    const values = this.getRowValues(item, currency);

    let currentX = margin.left;
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      let cursor = y + 3.5;

      if (i === 1) {
        const textWidth = col.width - 10;
        doc.font(FONTS.regular).fontSize(6.8).fillColor(BRAND.black);
        for (const line of wrapText(doc, item.name, FONTS.regular, 6.8, textWidth)) {
          doc.text(line, currentX + 5, cursor, { width: textWidth, lineBreak: false });
          cursor += 9.3;
        }
        if (item.description) {
          doc.font(FONTS.regular).fontSize(6.2).fillColor(BRAND.muted);
          for (const line of wrapText(doc, item.description, FONTS.regular, 6.2, textWidth)) {
            doc.text(line, currentX + 5, cursor, { width: textWidth, lineBreak: false });
            cursor += 9.3;
          }
        }
      } else {
        const text = values[i];
        const lines = wrapText(doc, text, FONTS.regular, 6.8, col.width - 8);
        doc.font(FONTS.regular).fontSize(6.8).fillColor(BRAND.black);
        for (const line of lines) {
          const textWidth = doc.widthOfString(line);
          let tx = currentX + 5;
          if (col.align === 'center') tx = currentX + (col.width - textWidth) / 2;
          if (col.align === 'right') tx = currentX + col.width - textWidth - 5;
          doc.text(line, tx, cursor, { lineBreak: false });
          cursor += 9.3;
        }
      }
      currentX += col.width;
    }

    this.engine.drawLine(margin.left, y + rowHeight, margin.left + cw, y + rowHeight, {
      color: BRAND.tableBorder,
      width: 0.3,
    });

    return rowHeight;
  }

  private getTableColumns(cw: number) {
    const itemWidth = Math.max(110, cw - 318);
    return [
      { header: 'No.', width: 20, align: 'center' },
      { header: 'Item & Description', width: itemWidth, align: 'left' },
      { header: 'HSN', width: 38, align: 'center' },
      { header: 'Qty', width: 34, align: 'right' },
      { header: 'Unit', width: 28, align: 'left' },
      { header: 'Rate', width: 56, align: 'right' },
      { header: 'Disc.', width: 44, align: 'right' },
      { header: 'GST', width: 30, align: 'center' },
      { header: 'Amount', width: 68, align: 'right' },
    ];
  }

  private getRowValues(item: TableData['items'][0], currency: string): string[] {
    return [
      String(item.sno),
      item.name,
      item.hsn || '-',
      String(item.quantity),
      item.unit,
      formatCurrency(item.rate, currency),
      item.discount
        ? `${item.discountType === 'Percentage' ? item.discount + '%' : formatCurrency(item.discount, currency)}`
        : '-',
      item.gstRate ? item.gstRate + '%' : '-',
      formatCurrency(item.amount, currency),
    ];
  }

  private renderTableBorders(startY: number, endY: number, cw: number) {
    const margin = this.engine.getMargin();
    const x0 = margin.left;
    const x1 = x0 + cw;

    this.engine.drawLine(x0, startY, x0, endY, { color: BRAND.tableBorder, width: 0.3 });
    this.engine.drawLine(x1, startY, x1, endY, { color: BRAND.tableBorder, width: 0.3 });
    this.engine.drawLine(x0, endY, x1, endY, { color: BRAND.tableBorder, width: 0.4 });

    let colX = x0;
    for (const col of this.getTableColumns(cw)) {
      colX += col.width;
      if (colX < x1) {
        this.engine.drawLine(colX, startY, colX, endY, { color: BRAND.tableBorder, width: 0.3 });
      }
    }
  }

  measureSummary(_data: SummaryData): SectionDimensions {
    const rows = this.buildSummaryRows(_data);
    const panelHeight = 18 + rows.length * 13 + 20;
    const words = numberToWords(_data.grandTotal);
    const wordsLines = Math.ceil(words.length / 100);
    const wordsHeight = wordsLines * 9.5 + 8;

    const height = panelHeight + 5 + wordsHeight + 3;

    return {
      height,
      minHeight: height,
      preferredHeight: height,
      maxHeight: height,
    };
  }

  renderSummary(_data: SummaryData, y: number): number {
    const doc = this.engine.doc;
    const margin = this.engine.getMargin();
    const cw = this.engine.getContentWidth();

    const panelWidth = 240;
    const x = margin.left + cw - panelWidth;
    const rows = this.buildSummaryRows(_data);
    const panelHeight = 18 + rows.length * 13 + 20;

    this.engine.drawRect(x - 2, y - 2, panelWidth + 4, panelHeight + 4, {
      strokeColor: BRAND.darkBorder,
      strokeWidth: 0.5,
    });

    this.engine.drawRect(x, y, panelWidth, 18, { fillColor: BRAND.primary });
    doc.font(FONTS.bold).fontSize(7.5).fillColor(BRAND.white);
    doc.text('SUMMARY', x + 10, y + 6, { lineBreak: false });

    const labelX = x + 10;
    const valueX = x + 10 + 120;
    const valueWidth = panelWidth - 20 - 120;

    let cursor = y + 18;
    doc.font(FONTS.regular).fontSize(7.5).fillColor(BRAND.black);
    for (const row of rows) {
      doc.text(row.label, labelX, cursor + 3.5, { width: 118, lineBreak: false });
      doc.text(row.value, valueX, cursor + 3.5, {
        width: valueWidth,
        align: 'right',
        lineBreak: false,
      });
      this.engine.drawLine(x, cursor + 12, x + panelWidth, cursor + 12, {
        color: BRAND.tableBorder,
        width: 0.3,
      });
      cursor += 13;
    }

    this.engine.drawRect(x, cursor, panelWidth, 20, { fillColor: BRAND.grandTotalBg });
    doc.font(FONTS.bold).fontSize(7.5).fillColor(BRAND.grandTotalText);
    doc.text('GRAND TOTAL', labelX, cursor + 7, { lineBreak: false });
    doc.font(FONTS.bold).fontSize(8.7).fillColor(BRAND.grandTotalText);
    doc.text(formatCurrency(_data.grandTotal, _data.currency), valueX, cursor + 6.5, {
      width: valueWidth,
      align: 'right',
      lineBreak: false,
    });
    cursor += 20;

    const words = numberToWords(_data.grandTotal);
    cursor += 5;
    doc.font(FONTS.bold).fontSize(6.5).fillColor(BRAND.muted);
    doc.text('AMOUNT IN WORDS:', margin.left, cursor, { lineBreak: false });
    cursor += 8;
    const lines = words.match(/.{1,100}/g) || [words];
    doc.font(FONTS.italic).fontSize(7).fillColor(BRAND.black);
    for (const line of lines) {
      doc.text(line, margin.left, cursor, { width: cw, lineBreak: false });
      cursor += 9.5;
    }

    return cursor + 3;
  }

  private buildSummaryRows(_data: SummaryData): { label: string; value: string }[] {
    const rows: { label: string; value: string }[] = [
      { label: 'Subtotal', value: formatCurrency(_data.subtotal, _data.currency) },
    ];

    if (_data.discount && _data.discount !== 0) {
      const label =
        _data.discountType === 'Percentage' ? `Discount (${_data.discount}%)` : 'Discount';
      const value =
        _data.discountType === 'Percentage'
          ? formatCurrency((_data.subtotal * _data.discount) / 100, _data.currency)
          : formatCurrency(_data.discount, _data.currency);
      rows.push({ label, value: '-' + value });
    }

    if (_data.cgst && _data.cgst !== 0)
      rows.push({ label: 'CGST', value: formatCurrency(_data.cgst, _data.currency) });
    if (_data.sgst && _data.sgst !== 0)
      rows.push({ label: 'SGST', value: formatCurrency(_data.sgst, _data.currency) });
    if (_data.igst && _data.igst !== 0)
      rows.push({ label: 'IGST', value: formatCurrency(_data.igst, _data.currency) });
    if (_data.packing && _data.packing !== 0)
      rows.push({ label: 'Packing Charges', value: formatCurrency(_data.packing, _data.currency) });
    if (_data.freight && _data.freight !== 0)
      rows.push({ label: 'Freight', value: formatCurrency(_data.freight, _data.currency) });
    if (_data.transport && _data.transport !== 0)
      rows.push({
        label: 'Shipping Charges',
        value: formatCurrency(_data.transport, _data.currency),
      });
    if (_data.other && _data.other !== 0)
      rows.push({ label: 'Other Charges', value: formatCurrency(_data.other, _data.currency) });
    if (_data.roundOff && Math.abs(_data.roundOff) > 0.001) {
      const sign = _data.roundOff > 0 ? '+' : '-';
      rows.push({
        label: 'Round Off',
        value: sign + formatCurrency(Math.abs(_data.roundOff), _data.currency),
      });
    }

    return rows;
  }

  measureTerms(_data: TermsData): SectionDimensions {
    const doc = this.engine.doc;
    const cw = this.engine.getContentWidth();
    const terms = _data.terms || this.getDefaultTerms();
    const lines = wrapText(doc, terms, FONTS.regular, 6.5, cw - 24);
    const count = Math.min(lines.length, 7);
    const height = 16 + count * 8.2 + 5;

    return {
      height,
      minHeight: 30,
      preferredHeight: height,
      maxHeight: 80,
    };
  }

  renderTerms(_data: TermsData, y: number): number {
    const doc = this.engine.doc;
    const margin = this.engine.getMargin();
    const cw = this.engine.getContentWidth();

    this.engine.drawRect(margin.left, y, cw, 16, { fillColor: BRAND.primary });
    doc.font(FONTS.bold).fontSize(7).fillColor(BRAND.white);
    doc.text('TERMS & CONDITIONS', margin.left + 10, y + 5, { lineBreak: false });

    const terms = _data.terms || this.getDefaultTerms();
    const lines = wrapText(doc, terms, FONTS.regular, 6.5, cw - 24);
    let cursor = y + 19;
    doc.font(FONTS.regular).fontSize(6.5).fillColor(BRAND.black);
    for (let i = 0; i < lines.length && i < 7; i++) {
      doc.text(lines[i], margin.left + 10, cursor, { width: cw - 20, lineBreak: false });
      cursor += 8.2;
    }

    return cursor + 2;
  }

  private getDefaultTerms(): string {
    return [
      '1. All goods must conform to the specifications and quality standards as agreed upon.',
      '2. Delivery must be made on or before the agreed delivery date.',
      '3. Invoice must be submitted along with delivery challan and quality certificates.',
      '4. Payment will be processed as per the agreed payment terms after successful delivery.',
      '5. GST will be charged as applicable and must be clearly mentioned on the invoice.',
      '6. Any disputes arising shall be subject to the jurisdiction of local courts.',
    ].join('\n');
  }

  measureSignatures(_data: SignatureData): SectionDimensions {
    return {
      height: 0,
      minHeight: 0,
      preferredHeight: 0,
      maxHeight: 0,
    };
  }

  renderSignatures(_data: SignatureData, y: number): number {
    return y;
  }

  measureFooter(_data: FooterData): SectionDimensions {
    return {
      height: 34,
      minHeight: 34,
      preferredHeight: 34,
      maxHeight: 34,
    };
  }

  renderFooter(_data: FooterData, _y: number): number {
    const doc = this.engine.doc;
    const margin = this.engine.getMargin();
    const cw = this.engine.getContentWidth();

    const ruleY = PAGE.height - 34;
    this.engine.drawLine(margin.left, ruleY, margin.left + cw, ruleY, {
      color: BRAND.primary,
      width: 1,
    });

    const infoY = ruleY + 8;
    doc.font(FONTS.italic).fontSize(5.6).fillColor(BRAND.muted);
    doc.text(
      `Computer Generated Document  ·  Generated on ${_data.generatedAt}`,
      margin.left,
      infoY,
      {
        width: cw * 0.62,
        lineBreak: false,
      },
    );
    doc.font(FONTS.regular).fontSize(5.6).fillColor(BRAND.muted);
    doc.text(`Page ${_data.pageNum} of ${_data.totalPages}`, margin.left + cw * 0.62, infoY, {
      width: cw * 0.38,
      align: 'right',
      lineBreak: false,
    });

    const bottomY = infoY + 11;
    doc.font(FONTS.bold).fontSize(5.6).fillColor(BRAND.muted);
    doc.text(_data.companyName || 'PEB Systems', margin.left, bottomY, {
      width: cw,
      align: 'center',
      lineBreak: false,
    });

    return PAGE.height;
  }
}
