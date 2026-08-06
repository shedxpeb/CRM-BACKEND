import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

@Injectable()
export class HtmlPdfService {
  private readonly logger = new Logger(HtmlPdfService.name);
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.registerHelpers();
    this.loadTemplates();
  }

  private registerHelpers() {
    Handlebars.registerHelper('formatCurrency', (value: number, currency: string = 'INR') => {
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
    });

    Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);
    Handlebars.registerHelper('abs', (value: number) => Math.abs(value));
  }

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
        this.logger.log(`Loaded template: ${templateName} from path: ${templatePath}`);
      }
    }
  }

  async generatePdf(templateName: string, data: Record<string, unknown>): Promise<Buffer> {
    const template = this.templates.get(templateName);

    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    this.logger.log(`Generating PDF using template: ${templateName}`);
    this.logger.log(`Available templates: ${Array.from(this.templates.keys()).join(', ')}`);

    const html = template(data);

    // Save generated HTML to file for debugging
    const debugHtmlPath = path.join(process.cwd(), 'debug-pdf-output.html');
    fs.writeFileSync(debugHtmlPath, html);
    this.logger.log(`Generated HTML saved to: ${debugHtmlPath}`);

    // Log first 500 chars of generated HTML for debugging
    this.logger.log(`Generated HTML preview (first 500 chars): ${html.substring(0, 500)}`);

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: 'networkidle',
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '8mm',
          right: '10mm',
          bottom: '15mm',
          left: '10mm',
        },
        printBackground: true,
        preferCSSPageSize: true,
      });

      await page.close();

      this.logger.log(`PDF generated successfully: ${templateName}`);

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  async generatePurchaseOrderPdf(data: Record<string, unknown>): Promise<Buffer> {
    this.logger.log('=== GENERATE PURCHASE ORDER PDF START ===');
    this.logger.log(`Working directory: ${process.cwd()}`);
    this.logger.log(`Templates directory: ${path.join(process.cwd(), 'templates')}`);
    this.logger.log(`Available templates: ${Array.from(this.templates.keys()).join(', ')}`);

    const pdfData = {
      ...data,
      generatedAt: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      amountInWords: this.numberToWords(Number(data.grandTotal)),
    };

    this.logger.log('=== CALLING GENERATE PDF ===');
    return this.generatePdf('purchase-order', pdfData);
  }

  private numberToWords(num: number): string {
    if (num === null || num === undefined) return 'Zero';

    const n = Number(num);
    if (isNaN(n)) return 'Zero';

    if (n === 0) return 'Zero';

    const ones = [
      '',
      'One',
      'Two',
      'Three',
      'Four',
      'Five',
      'Six',
      'Seven',
      'Eight',
      'Nine',
      'Ten',
      'Eleven',
      'Twelve',
      'Thirteen',
      'Fourteen',
      'Fifteen',
      'Sixteen',
      'Seventeen',
      'Eighteen',
      'Nineteen',
    ];
    const tens = [
      '',
      '',
      'Twenty',
      'Thirty',
      'Forty',
      'Fifty',
      'Sixty',
      'Seventy',
      'Eighty',
      'Ninety',
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

      if (n > 0) {
        result += ones[n] + ' ';
      }

      return result.trim();
    };

    const convert = (n: number): string => {
      if (n === 0) return 'Zero';

      let result = '';

      const crores = Math.floor(n / 10000000);
      if (crores > 0) {
        result += convertLessThanThousand(crores) + ' Crore ';
        n %= 10000000;
      }

      const lakhs = Math.floor(n / 100000);
      if (lakhs > 0) {
        result += convertLessThanThousand(lakhs) + ' Lakh ';
        n %= 100000;
      }

      const thousands = Math.floor(n / 1000);
      if (thousands > 0) {
        result += convertLessThanThousand(thousands) + ' Thousand ';
        n %= 1000;
      }

      const hundreds = Math.floor(n / 100);
      if (hundreds > 0) {
        result += convertLessThanThousand(hundreds) + ' Hundred ';
        n %= 100;
      }

      if (n > 0) {
        result += convertLessThanThousand(n);
      }

      return result.trim();
    };

    const integerPart = Math.floor(n);
    const decimalPart = Math.round((n - integerPart) * 100);

    let result = convert(integerPart);
    result += ' Rupees';

    if (decimalPart > 0) {
      result += ' and ' + convert(decimalPart) + ' Paise';
    }

    return result + ' Only';
  }
}
