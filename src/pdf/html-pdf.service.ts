import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { chromium, Browser, BrowserContext } from 'playwright';

/**
 * Maximum concurrent PDF generation pages.
 * Chromium memory ≈ 50-100MB per page. With 1G PM2 limit, 2 is safe.
 */
const MAX_CONCURRENT_PAGES = 2;

@Injectable()
export class HtmlPdfService implements OnModuleDestroy {
  private readonly logger = new Logger(HtmlPdfService.name);
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private browser: Browser | null = null;
  private browserContext: BrowserContext | null = null;
  private activePages = 0;
  private queue: Array<() => void> = [];

  constructor() {
    this.registerHelpers();
    this.loadTemplates();
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }

  // ─── Handlebars Helpers (registered ON, shared by all templates) ───────────

  private registerHelpers() {
    // Register helpers only if not already registered (avoid collision)
    if (!Handlebars.helpers.formatCurrency) {
      Handlebars.registerHelper(
        'formatCurrency',
        (value: number, currency: string = 'INR') => {
          if (value === null || value === undefined) return '-';
          const num = Number(value);
          if (isNaN(num)) return '-';
          const formatter = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          return formatter.format(num);
        },
      );
    }

    if (!Handlebars.helpers.eq) {
      Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
      Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
      Handlebars.registerHelper('lt', (a: number, b: number) => a < b);
      Handlebars.registerHelper('abs', (value: number) => Math.abs(value));
    }
  }

  // ─── Template Loading ─────────────────────────────────────────────────────

  private loadTemplates() {
    const templatesDir = path.join(process.cwd(), 'templates');

    this.logger.log(`Loading templates from directory: ${templatesDir}`);

    if (!fs.existsSync(templatesDir)) {
      this.logger.warn(`Templates directory not found: ${templatesDir}`);
      return;
    }

    const files = fs.readdirSync(templatesDir);
    this.logger.log(`Found ${files.length} files in templates directory`);

    for (const file of files) {
      if (file.endsWith('.hbs')) {
        const templateName = file.replace('.hbs', '');
        const templatePath = path.join(templatesDir, file);
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        const template = Handlebars.compile(templateContent);
        this.templates.set(templateName, template);
        this.logger.log(`Loaded template: ${templateName}`);
      }
    }
  }

  /**
   * Force-reload templates (useful after template changes in development).
   */
  reloadTemplates() {
    this.templates.clear();
    this.loadTemplates();
  }

  // ─── Browser Pooling ──────────────────────────────────────────────────────

  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    this.logger.log('Launching persistent Chromium browser...');
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
    });

    this.browserContext = await this.browser.newContext({
      viewport: { width: 595, height: 842 }, // A4 dimensions at 72dpi
    });

    this.browser.on('disconnected', () => {
      this.logger.warn('Chromium browser disconnected');
      this.browser = null;
      this.browserContext = null;
    });

    this.logger.log('Chromium browser launched successfully');
    return this.browser;
  }

  private async closeBrowser() {
    try {
      if (this.browserContext) {
        await this.browserContext.close().catch(() => {});
      }
      if (this.browser) {
        await this.browser.close().catch(() => {});
      }
    } catch {
      // Ignore cleanup errors
    }
    this.browser = null;
    this.browserContext = null;
  }

  /**
   * Acquire a page slot. Blocks if MAX_CONCURRENT_PAGES is reached.
   */
  private async acquirePageSlot(): Promise<void> {
    if (this.activePages < MAX_CONCURRENT_PAGES) {
      this.activePages++;
      return;
    }

    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.activePages++;
        resolve();
      });
    });
  }

  /**
   * Release a page slot and wake up the next queued request.
   */
  private releasePageSlot() {
    this.activePages--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    }
  }

  // ─── PDF Generation ───────────────────────────────────────────────────────

  async generatePdf(templateName: string, data: Record<string, unknown>): Promise<Buffer> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}. Available: ${Array.from(this.templates.keys()).join(', ')}`);
    }

    // Acquire a page slot (blocks if at capacity)
    await this.acquirePageSlot();

    try {
      const html = template(data);

      // Save debug HTML in development only
      if (process.env.NODE_ENV !== 'production') {
        const debugHtmlPath = path.join(process.cwd(), 'debug-pdf-output.html');
        fs.writeFileSync(debugHtmlPath, html);
      }

      const browser = await this.getBrowser();
      const context = this.browserContext || await browser.newContext();
      const page = await context.newPage();

      try {
        await page.setContent(html, { waitUntil: 'networkidle' });

        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          preferCSSPageSize: true,
        });

        this.logger.log(`PDF generated: ${templateName} (${pdfBuffer.length} bytes)`);
        return pdfBuffer;
      } finally {
        await page.close().catch(() => {});
      }
    } finally {
      this.releasePageSlot();
    }
  }

  async generatePurchaseOrderPdf(data: Record<string, unknown>): Promise<Buffer> {
    const pdfData = {
      ...data,
      generatedAt: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      amountInWords: this.numberToWords(Number(data.grandTotal)),
    };

    return this.generatePdf('purchase-order', pdfData);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private numberToWords(num: number): string {
    if (num === null || num === undefined) return 'Zero';
    const n = Number(num);
    if (isNaN(n) || n === 0) return 'Zero';

    const ones = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen',
    ];
    const tens = [
      '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
    ];

    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      let result = '';
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) result += ones[n] + ' ';
      return result.trim();
    };

    const convert = (n: number): string => {
      if (n === 0) return 'Zero';
      let result = '';
      const crores = Math.floor(n / 10000000);
      if (crores > 0) { result += convertLessThanThousand(crores) + ' Crore '; n %= 10000000; }
      const lakhs = Math.floor(n / 100000);
      if (lakhs > 0) { result += convertLessThanThousand(lakhs) + ' Lakh '; n %= 100000; }
      const thousands = Math.floor(n / 1000);
      if (thousands > 0) { result += convertLessThanThousand(thousands) + ' Thousand '; n %= 1000; }
      const hundreds = Math.floor(n / 100);
      if (hundreds > 0) { result += convertLessThanThousand(hundreds) + ' Hundred '; n %= 100; }
      if (n > 0) result += convertLessThanThousand(n);
      return result.trim();
    };

    const integerPart = Math.floor(n);
    const decimalPart = Math.round((n - integerPart) * 100);
    let result = convert(integerPart) + ' Rupees';
    if (decimalPart > 0) result += ' and ' + convert(decimalPart) + ' Paise';
    return result + ' Only';
  }
}
