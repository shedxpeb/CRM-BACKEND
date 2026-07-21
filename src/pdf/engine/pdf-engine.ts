import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { PassThrough } from 'stream';
import { BRAND, FONTS, PAGE } from '../helpers/colors';

export interface PdfEngineOptions {
  margin?: { top: number; bottom: number; left: number; right: number };
  title?: string;
  author?: string;
  subject?: string;
}

export class PdfEngine {
  doc: PDFKit.PDFDocument;
  private pageMargin: { top: number; bottom: number; left: number; right: number };
  private contentWidth: number;
  private currentY: number;
  private pageHeight: number;
  private pageCount = 0;
  private headerCallback: ((doc: PDFKit.PDFDocument, pageNum: number, totalPages: number) => void) | null = null;
  private footerCallback: ((doc: PDFKit.PDFDocument, pageNum: number, totalPages: number) => void) | null = null;
  private stream: PassThrough;
  private assetsPath: string;

  constructor(options?: PdfEngineOptions) {
    this.pageMargin = options?.margin || { ...PAGE.margin } as { top: number; bottom: number; left: number; right: number };
    this.contentWidth = PAGE.width - this.pageMargin.left - this.pageMargin.right;
    this.pageHeight = PAGE.height;
    this.currentY = this.pageMargin.top;

    this.doc = new PDFDocument.default({
      size: 'A4',
      margins: this.pageMargin,
      bufferPages: true,
      info: {
        Title: options?.title || 'Document',
        Author: options?.author || 'PEB CRM',
        Subject: options?.subject || 'Enterprise Document',
        Creator: 'PEB PDF Engine',
      },
    });

    this.assetsPath = path.join(process.cwd(), 'src', 'assets');
    this.loadFonts();
    this.addPage();

    this.stream = new PassThrough();
    this.doc.pipe(this.stream);
  }

  private loadFonts() {
    const fontsDir = path.join(this.assetsPath, 'fonts');
    const register = (file: string, name: string) => {
      const fullPath = path.join(fontsDir, file);
      if (fs.existsSync(fullPath)) {
        this.doc.registerFont(name, fullPath);
      }
    };
    register('Calibri.ttf', FONTS.regular);
    register('Calibri-Bold.ttf', FONTS.bold);
    register('Calibri-Italic.ttf', FONTS.italic);
    register('Calibri-BoldItalic.ttf', FONTS.boldItalic);
  }

  getAssetsPath(): string {
    return this.assetsPath;
  }

  addPage() {
    if (this.pageCount > 0) {
      this.doc.addPage();
    }
    this.pageCount++;
    this.currentY = this.pageMargin.top;
    return this;
  }

  ensureSpace(needed: number): boolean {
    const available = this.pageHeight - this.pageMargin.bottom - this.currentY;
    if (needed > available) {
      this.renderHeaderFooter();
      this.addPage();
      this.renderHeaderFooter();
      return true;
    }
    return false;
  }

  setHeaderCallback(cb: (doc: PDFKit.PDFDocument, pageNum: number, totalPages: number) => void) {
    this.headerCallback = cb;
    return this;
  }

  setFooterCallback(cb: (doc: PDFKit.PDFDocument, pageNum: number, totalPages: number) => void) {
    this.footerCallback = cb;
    return this;
  }

  renderHeaderFooter() {
    if (this.headerCallback) {
      this.headerCallback(this.doc, this.pageCount, this.pageCount);
    }
    if (this.footerCallback) {
      this.footerCallback(this.doc, this.pageCount, this.pageCount);
    }
  }

  renderAllHeaderFooters() {
    const pages = this.doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      this.doc.switchToPage(i);
      if (this.headerCallback) {
        this.headerCallback(this.doc, i + 1, pages.count);
      }
      if (this.footerCallback) {
        this.footerCallback(this.doc, i + 1, pages.count);
      }
    }
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, options?: { color?: string; width?: number; dash?: number[] }) {
    this.doc.save();
    this.doc.moveTo(x1, y1).lineTo(x2, y2);
    this.doc.strokeColor(options?.color || BRAND.border);
    this.doc.lineWidth(options?.width || 0.5);
    if (options?.dash) this.doc.dash(options.dash[0], { space: options.dash[1] || 2 });
    this.doc.stroke();
    this.doc.restore();
    return this;
  }

  drawRect(x: number, y: number, w: number, h: number, options?: { fillColor?: string; strokeColor?: string; strokeWidth?: number; radius?: number }) {
    this.doc.save();
    if (options?.fillColor) {
      this.doc.rect(x, y, w, h).fill(options.fillColor);
    }
    if (options?.strokeColor) {
      this.doc.rect(x, y, w, h).lineWidth(options.strokeWidth || 0.5).strokeColor(options.strokeColor).stroke();
    }
    this.doc.restore();
    return this;
  }

  drawText(text: string, x: number, y: number, options?: {
    font?: string;
    size?: number;
    color?: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
    lineBreak?: boolean;
  }): number {
    this.doc.save();
    this.doc.font(options?.font || FONTS.regular)
      .fontSize(options?.size || 8)
      .fillColor(options?.color || BRAND.black);

    const textOptions: any = {
      lineBreak: options?.lineBreak ?? false,
    };
    if (options?.width) textOptions.width = options.width;
    if (options?.align) textOptions.align = options.align;

    this.doc.text(text, x, y, textOptions);
    const height = this.doc.heightOfString(text, { width: options?.width || this.contentWidth });
    this.doc.restore();
    return y + height;
  }

  measureText(text: string, font: string, size: number, width?: number): { width: number; height: number } {
    this.doc.font(font).fontSize(size);
    const height = this.doc.heightOfString(text || '', { width: width || this.contentWidth });
    const textWidth = this.doc.widthOfString(text || '');
    return { width: Math.min(textWidth, width || Infinity), height };
  }

  moveY(delta: number) {
    this.currentY += delta;
    return this;
  }

  getY(): number {
    return this.currentY;
  }

  setY(y: number) {
    this.currentY = y;
    return this;
  }

  getContentWidth(): number {
    return this.contentWidth;
  }

  getMargin(): { top: number; bottom: number; left: number; right: number } {
    return this.pageMargin;
  }

  loadLogo(): Buffer | null {
    const logoPath = path.join(this.assetsPath, 'branding', 'logo.png');
    if (fs.existsSync(logoPath)) {
      return fs.readFileSync(logoPath);
    }
    return null;
  }

  getPageCount(): number {
    return this.doc.bufferedPageRange().count;
  }

  async finalize(): Promise<PassThrough> {
    this.renderAllHeaderFooters();
    this.doc.end();
    return this.stream;
  }
}
