import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Logger,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProduces } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { HtmlPdfService } from './html-pdf.service';
import * as fs from 'fs';
import * as path from 'path';

interface PurchaseOrderPdfData {
  poNumber: string;
  poDate: string;
  revision?: number;
  status?: string;
  paymentTerms?: string;
  expectedDelivery?: string;
  projectName?: string;
  warehouseName?: string;
  generatedAt?: string;
  shippingMethod?: string;

  companyLogoBase64?: string;

  company: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    email?: string;
    website?: string;
    gstin?: string;
  };

  buyer: {
    company?: string;
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };

  supplier: {
    company: string;
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };

  items: {
    name: string;
    description?: string;
    hsn?: string;
    quantity: number;
    unit: string;
    rate: number;
    discount?: number;
    discountType?: string;
    gstRate?: number;
    gstAmount?: number;
    total: number;
  }[];

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

  terms?: string;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function formatDate(d?: Date): string | undefined {
  if (!d) return undefined;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

@ApiTags('purchase-order-pdf')
@ApiBearerAuth()
@Controller('purchase-order')
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly htmlPdfService: HtmlPdfService,
  ) {}

  @Get(':id/pdf')
  @RequirePermissions('purchase-order:read')
  @ApiOperation({ summary: 'Generate and stream Purchase Order PDF' })
  @ApiProduces('application/pdf')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async generatePdf(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<StreamableFile> {
    // Single optimized query — PO + items + vendor + organization in one hit.
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId, isDeleted: false },
      include: {
        items: true,
        vendor: true,
        organization: true,
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    const org = po.organization;
    const vendor = po.vendor;

    // ── Financial breakdown (backend authoritative, never trust the client) ──
    const totalTax = round2(Number(po.tax) || 0);
    const sameState = !!(
      org?.state &&
      vendor?.state &&
      org.state.trim().toLowerCase() === vendor.state.trim().toLowerCase()
    );

    let igst = 0;
    for (const item of po.items) {
      const rate = Number(item.gstRate) || 0;
      if (!sameState && rate > 0) {
        igst += Number(item.gstAmount) || 0;
      }
    }
    igst = round2(igst);
    const intraStateTax = round2(totalTax - igst);
    const cgst = round2(intraStateTax / 2);
    const sgst = round2(intraStateTax - cgst);

    const warehouse = po.warehouseId
      ? await this.prisma.warehouse.findUnique({ where: { id: po.warehouseId } })
      : null;

    const _shipToCompany = warehouse?.name || org?.name;
    const _shipToAddress =
      warehouse?.address ||
      warehouse?.location ||
      [org?.address, [org?.city, org?.state, org?.pincode].filter(Boolean).join(', ')]
        .filter(Boolean)
        .join(', ');

    // Convert logo to Base64 if available
    let companyLogoBase64: string | undefined;

    // Try to load logo from Company Profile settings
    if (org?.settings && typeof org.settings === 'object') {
      const settings = org.settings as Record<string, unknown>;
      if (settings.logo) {
        try {
          const logoPath = path.join(process.cwd(), 'public', settings.logo as string);
          if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            const ext = path.extname(logoPath).slice(1);
            companyLogoBase64 = `data:image/${ext};base64,${logoBuffer.toString('base64')}`;
          }
        } catch (error) {
          this.logger.warn(`Failed to load company logo: ${error.message}`);
        }
      }
    }

    // Fallback to default logo if company logo is not available
    if (!companyLogoBase64) {
      try {
        const publicDir = path.join(process.cwd(), '..', 'frontend', 'public');
        const logoExtensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];

        for (const ext of logoExtensions) {
          const logoPath = path.join(publicDir, `logo.${ext}`);
          if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
            companyLogoBase64 = `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
            this.logger.log(`Loaded logo from: logo.${ext}`);
            break;
          }
        }

        if (!companyLogoBase64) {
          this.logger.warn(
            'No logo file found in frontend/public folder (checked: logo.png, logo.jpg, logo.jpeg, logo.svg, logo.webp)',
          );
        }
      } catch (error) {
        this.logger.warn(`Failed to load default logo: ${error.message}`);
      }
    }

    const pdfData: PurchaseOrderPdfData = {
      poNumber: po.poNumber,
      poDate: formatDate(po.createdAt) || '',
      revision: po.revision ?? '-',
      status: po.status,
      paymentTerms: po.paymentTerms || undefined,
      expectedDelivery: formatDate(po.expectedDeliveryDate || undefined),
      projectName: po.projectName || undefined,
      warehouseName: warehouse?.name || undefined,
      generatedAt: formatDate(new Date()),
      companyLogoBase64,

      company: {
        name: org?.name || 'PEB Systems',
        address: org?.address || undefined,
        city: org?.city || undefined,
        state: org?.state || undefined,
        pincode: org?.pincode || undefined,
        phone: org?.mobile || undefined,
        email: org?.email || undefined,
        website: org?.website || undefined,
        gstin: org?.gstNumber || undefined,
      },

      buyer: {
        name: ((po as unknown as Record<string, unknown>).shipToName as string) || undefined,
        company:
          ((po as unknown as Record<string, unknown>).shipToCompanyName as string) || undefined,
        address: ((po as unknown as Record<string, unknown>).shipToAddress as string) || undefined,
        city: ((po as unknown as Record<string, unknown>).shipToCity as string) || undefined,
        state: ((po as unknown as Record<string, unknown>).shipToState as string) || undefined,
        pincode: ((po as unknown as Record<string, unknown>).shipToPincode as string) || undefined,
        phone: ((po as unknown as Record<string, unknown>).shipToPhone as string) || undefined,
        email: ((po as unknown as Record<string, unknown>).shipToEmail as string) || undefined,
        gstin: ((po as unknown as Record<string, unknown>).shipToGstNumber as string) || undefined,
      },

      supplier: {
        name: ((po as unknown as Record<string, unknown>).supplierName as string) || undefined,
        company:
          ((po as unknown as Record<string, unknown>).supplierCompanyName as string) ||
          po.vendorName,
        address:
          ((po as unknown as Record<string, unknown>).supplierAddress as string) || undefined,
        city: ((po as unknown as Record<string, unknown>).supplierCity as string) || undefined,
        state: ((po as unknown as Record<string, unknown>).supplierState as string) || undefined,
        pincode:
          ((po as unknown as Record<string, unknown>).supplierPincode as string) || undefined,
        phone: ((po as unknown as Record<string, unknown>).supplierPhone as string) || undefined,
        email: ((po as unknown as Record<string, unknown>).supplierEmail as string) || undefined,
        gstin:
          ((po as unknown as Record<string, unknown>).supplierGstNumber as string) || undefined,
      },

      items: po.items.map((item) => ({
        name: item.itemName,
        description: item.description || undefined,
        hsn: item.hsnCode || undefined,
        quantity: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate),
        discount: item.discount ? Number(item.discount) : undefined,
        discountType: item.discountType || undefined,
        gstRate: item.gstRate ? Number(item.gstRate) : undefined,
        gstAmount: item.gstAmount ? Number(item.gstAmount) : undefined,
        total: Number(item.total),
      })),

      subtotal: Number(po.subtotal),
      discount: po.discount ? Number(po.discount) : undefined,
      discountType: po.discountType || undefined,
      cgst,
      sgst,
      igst,
      packing: po.packingCharges ? Number(po.packingCharges) : undefined,
      freight: po.freight ? Number(po.freight) : undefined,
      transport: po.shippingCharges ? Number(po.shippingCharges) : undefined,
      other: po.otherCharges ? Number(po.otherCharges) : undefined,
      roundOff: po.roundOff ? Number(po.roundOff) : undefined,
      grandTotal: Number(po.grandTotal),
      currency: po.currency || 'INR',

      shippingMethod: 'By Road',
      terms: po.terms || undefined,
    };

    // Calculate expected grand total from individual components
    const expectedTotal =
      Number(po.subtotal) +
      (po.discount ? Number(po.discount) : 0) +
      cgst +
      sgst +
      igst +
      (po.packingCharges ? Number(po.packingCharges) : 0) +
      (po.freight ? Number(po.freight) : 0) +
      (po.shippingCharges ? Number(po.shippingCharges) : 0) +
      (po.otherCharges ? Number(po.otherCharges) : 0) +
      (po.roundOff ? Number(po.roundOff) : 0);

    // Calculate sum of item totals
    const sumOfItemTotals = po.items.reduce((sum, item) => sum + Number(item.total), 0);

    this.logger.log(`=== PDF DATA VALIDATION ===`);
    this.logger.log(`PO: ${po.poNumber}`);
    this.logger.log(`Sum of Item Totals: ${sumOfItemTotals}`);
    this.logger.log(`Subtotal: ${po.subtotal}`);
    this.logger.log(`Discount: ${po.discount || 0}`);
    this.logger.log(`CGST: ${cgst}`);
    this.logger.log(`SGST: ${sgst}`);
    this.logger.log(`IGST: ${igst}`);
    this.logger.log(`Packing: ${po.packingCharges || 0}`);
    this.logger.log(`Freight: ${po.freight || 0}`);
    this.logger.log(`Shipping Charges (transport): ${po.shippingCharges || 0}`);
    this.logger.log(`Other Charges: ${po.otherCharges || 0}`);
    this.logger.log(`Round Off: ${po.roundOff || 0}`);
    this.logger.log(`Expected Total (calculated): ${expectedTotal}`);
    this.logger.log(`Actual Grand Total (from DB): ${po.grandTotal}`);
    this.logger.log(`Difference: ${Number(po.grandTotal) - expectedTotal}`);
    this.logger.log(`Item Total vs Subtotal Diff: ${sumOfItemTotals - Number(po.subtotal)}`);
    this.logger.log(`Generating PDF for PO ${po.poNumber} using HTML template`);

    const pdfBuffer = await this.htmlPdfService.generatePurchaseOrderPdf(
      pdfData as unknown as Record<string, unknown>,
    );

    return new StreamableFile(Buffer.from(pdfBuffer), {
      type: 'application/pdf',
      disposition: `attachment; filename="${po.poNumber}.pdf"`,
    });
  }
}
