import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HtmlPdfService } from './html-pdf.service';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

// Note: Handlebars is imported only for registering helpers.
// Template compilation is delegated to HtmlPdfService.

// ─── PDF View Model Types ─────────────────────────────────────────────────────

export interface PdfQuotationViewModel {
  meta: {
    quotationNumber: string;
    date: string;
    validUntil: string;
    generatedAt: string;
    version: number;
  };

  organization: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email: string;
    website: string;
    gstin: string;
    logo: string;
    primaryColor: string;
    secondaryColor: string;
  };

  preparedFor: {
    customerName: string;
    companyName: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email: string;
    gstin: string;
  };

  preparedBy: {
    name: string;
    designation: string;
    company: string;
  };

  project: {
    projectName: string;
    projectType: string;
    structureType: string;
  };

  building: {
    length: string;
    width: string;
    height: string;
    area: string;
    baySpacing: string;
    roofSlope: string;
  };

  design: {
    designCode: string;
    windLoad: string;
    seismicZone: string;
    roofCladding: string;
    wallCladding: string;
    insulationType: string;
    insulationThickness: string;
    roofSlope: string;
  };

  loads: {
    deadLoad: string;
    liveLoad: string;
    windLoad: string;
    craneLoad: string;
    mezzanineLoad: string;
  };

  crane: {
    required: boolean;
    capacity: string;
    type: string;
  };

  mezzanine: {
    required: boolean;
    area: string;
    load: string;
  };

  accessories: {
    roofAccessories: string[];
    wallAccessories: string[];
  };

  materials: Array<{
    sno: number;
    itemName: string;
    specification: string;
    quantity: string;
    unit: string;
    rate: string;
    amount: string;
  }>;

  pricing: {
    materialCost: string;
    labourCost: string;
    installationCost: string;
    transportationCost: string;
    craneCost: string;
    civilCost: string;
    accommodationCost: string;
    erectionCost: string;
    freightCost: string;
    otherCosts: string;
    subtotal: string;
    markupPercentage: string;
    discountType: string;
    discountValue: string;
    discountAmount: string;
    gstType: string;
    gstRate: string;
    taxAmount: string;
    grandTotal: string;
    currency: string;
    amountInWords: string;
  };

  payment: {
    terms: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
    accountType: string;
  };

  delivery: {
    terms: string;
    estimatedDuration: string;
    milestones: Array<{
      milestone: string;
      estimatedDate: string;
    }>;
  };

  inclusions: string[];
  exclusions: string[];
  termsAndConditions: string;
  notes: string;

  branding: {
    coverImage: string;
    watermarkImage: string;
    watermarkOpacity: number;
    watermarkSize: string;
    watermarkPosition: string;
    headerLogo: string;
    footerLogo: string;
    primaryColor: string;
    secondaryColor: string;
  };
}

export interface PdfBrandingContext {
  companyName: string;
  companyLogo: string;
  primaryColor: string;
  secondaryColor: string;
  supportEmail: string;
  website: string;
  address: string;
  phone: string;
  gstNumber: string;
  city: string;
  state: string;
  pincode: string;
  coverImage: string;
  watermarkImage: string;
  watermarkOpacity: number;
  watermarkSize: string;
  watermarkPosition: string;
  headerLogo: string;
  footerLogo: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class QuotationPdfService {
  private readonly logger = new Logger(QuotationPdfService.name);

  /** In-memory cache for resolved assets (base64 data URIs). Keyed by org ID + asset path. */
  private assetCache = new Map<string, { dataUri: string; expiresAt: number }>();
  private readonly ASSET_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly htmlPdfService: HtmlPdfService,
  ) {
    this.registerHelpers();
  }

  private registerHelpers() {
    // Quotation-specific helpers (formatCurrency is already registered by HtmlPdfService)
    Handlebars.registerHelper('json', (context: unknown) => JSON.stringify(context));
    Handlebars.registerHelper(
      'ifArray',
      function (this: unknown, arr: unknown, options: Handlebars.HelperOptions) {
        if (Array.isArray(arr) && arr.length > 0) {
          return options.fn(this);
        }
        return options.inverse(this);
      },
    );
  }

  /**
   * Resolve branding for a given organization.
   * Merges Organization.settings.documentBranding with org fields and env defaults.
   */
  async resolveBranding(organizationId: string): Promise<PdfBrandingContext> {
    const defaults: PdfBrandingContext = {
      companyName: 'PEB CRM',
      companyLogo: '',
      primaryColor: '#1e3a8a',
      secondaryColor: '#3b82f6',
      supportEmail: '',
      website: '',
      address: '',
      phone: '',
      gstNumber: '',
      city: '',
      state: '',
      pincode: '',
      coverImage: '',
      watermarkImage: '',
      watermarkOpacity: 0.05,
      watermarkSize: '60%',
      watermarkPosition: 'center',
      headerLogo: '',
      footerLogo: '',
    };

    if (!organizationId) return defaults;

    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, isDeleted: false },
      select: {
        name: true,
        email: true,
        mobile: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        gstNumber: true,
        website: true,
        settings: true,
      },
    });

    if (!org) return defaults;

    const settings: Record<string, any> =
      org.settings && typeof org.settings === 'object' && !Array.isArray(org.settings)
        ? (org.settings as Record<string, any>)
        : {};

    const branding = (settings.branding || {}) as Record<string, any>;
    const docBranding = (settings.documentBranding || {}) as Record<string, any>;

    return {
      companyName: branding.companyName || org.name || defaults.companyName,
      companyLogo: branding.companyLogo || defaults.companyLogo,
      primaryColor: docBranding.primaryColor || branding.primaryColor || defaults.primaryColor,
      secondaryColor:
        docBranding.secondaryColor || branding.secondaryColor || defaults.secondaryColor,
      supportEmail: branding.supportEmail || org.email || defaults.supportEmail,
      website: branding.website || org.website || defaults.website,
      address: branding.address || org.address || defaults.address,
      phone: branding.phone || org.mobile || defaults.phone,
      gstNumber: org.gstNumber || defaults.gstNumber,
      city: org.city || defaults.city,
      state: org.state || defaults.state,
      pincode: org.pincode || defaults.pincode,
      coverImage: docBranding.coverImage || defaults.coverImage,
      watermarkImage: docBranding.watermarkImage || defaults.watermarkImage,
      watermarkOpacity: docBranding.watermarkOpacity ?? defaults.watermarkOpacity,
      watermarkSize: docBranding.watermarkSize || defaults.watermarkSize,
      watermarkPosition: docBranding.watermarkPosition || defaults.watermarkPosition,
      headerLogo: docBranding.headerLogo || defaults.headerLogo,
      footerLogo: docBranding.footerLogo || defaults.footerLogo,
    };
  }

  /**
   * Load an image as a base64 data URI with in-memory caching.
   * Avoids re-reading from filesystem on every PDF request.
   */
  loadLogoAsDataUri(logoPath: string): string {
    if (!logoPath) return '';

    // If already a data URI, return as-is (no caching needed)
    if (logoPath.startsWith('data:')) {
      return logoPath;
    }

    // If it's a remote URL, return as-is (Chromium will fetch it)
    if (logoPath.startsWith('http')) {
      return logoPath;
    }

    // Check cache
    const cacheKey = `asset:${logoPath}`;
    const cached = this.assetCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.dataUri;
    }

    // Load from filesystem
    try {
      const fullPath = path.isAbsolute(logoPath)
        ? logoPath
        : path.join(process.cwd(), 'public', logoPath);

      if (fs.existsSync(fullPath)) {
        const buffer = fs.readFileSync(fullPath);
        const ext = path.extname(fullPath).slice(1).toLowerCase();
        const mimeMap: Record<string, string> = {
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          svg: 'image/svg+xml',
          webp: 'image/webp',
          gif: 'image/gif',
        };
        const mime = mimeMap[ext] || 'image/png';
        const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;

        // Cache it
        this.assetCache.set(cacheKey, {
          dataUri,
          expiresAt: Date.now() + this.ASSET_CACHE_TTL_MS,
        });

        return dataUri;
      }
    } catch (error) {
      this.logger.warn(`Failed to load asset ${logoPath}: ${error.message}`);
    }
    return '';
  }

  /**
   * Map raw quotation data to the normalized PDF view model.
   */
  mapToViewModel(
    quotationData: Record<string, any>,
    branding: PdfBrandingContext,
  ): PdfQuotationViewModel {
    const q = quotationData;
    const ts = q.technicalSpecifications || {};
    const pc = q.pricingConfiguration || {};
    const sc = q.scopeConfiguration || {};
    const tl = q.timeline || {};
    const org = q._organization || {};

    // Logo resolution
    const logoDataUri = this.loadLogoAsDataUri(branding.companyLogo);

    return {
      meta: {
        quotationNumber: q.quotationNumber || 'N/A',
        date: this.formatDate(q.createdAt),
        validUntil: q.validUntil ? this.formatDate(q.validUntil) : 'N/A',
        generatedAt: this.formatDate(new Date()),
        version: q.version || 1,
      },

      organization: {
        name: branding.companyName || org.name || 'PEB CRM',
        address: branding.address || org.address || '',
        city: branding.city || org.city || '',
        state: branding.state || org.state || '',
        pincode: branding.pincode || org.pincode || '',
        phone: branding.phone || org.mobile || '',
        email: branding.supportEmail || org.email || '',
        website: branding.website || org.website || '',
        gstin: branding.gstNumber || org.gstNumber || '',
        logo: logoDataUri,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
      },

      preparedFor: {
        customerName: q.customerName || '',
        companyName: q.customerCompanyName || q.customerName || '',
        address: q.customerAddress || '',
        city: q.customerCity || '',
        state: q.customerState || '',
        pincode: q.customerPincode || '',
        phone: q.customerPhone || '',
        email: q.customerEmail || '',
        gstin: q.customerGST || '',
      },

      preparedBy: {
        name: q.createdBy || q.salesExecutive || '',
        designation: q.authorizedDesignation || 'Authorized Signatory',
        company: branding.companyName || org.name || '',
      },

      project: {
        projectName: q.projectName || '',
        projectType: q.projectType || '',
        structureType: q.structureType || '',
      },

      building: {
        length: this.fmt(ts.buildingLength, 'm'),
        width: this.fmt(ts.buildingWidth, 'm'),
        height: this.fmt(ts.buildingHeight, 'm'),
        area: this.fmt(ts.buildingArea, 'sqm'),
        baySpacing: this.fmt(ts.baySpacing, 'm'),
        roofSlope: this.fmt(ts.roofSlope, '°'),
      },

      design: {
        designCode: ts.designCode || 'IS 800:2007',
        windLoad: this.fmt(ts.windLoad, 'kN/m²'),
        seismicZone: ts.seismicZone || '',
        roofCladding: ts.roofCladding || '',
        wallCladding: ts.wallCladding || '',
        insulationType: ts.insulationType || '',
        insulationThickness: this.fmt(ts.insulationThickness, 'mm'),
        roofSlope: this.fmt(ts.roofSlope, '°'),
      },

      loads: {
        deadLoad: this.fmt(ts.deadLoad, 'kN/m²'),
        liveLoad: this.fmt(ts.liveLoad, 'kN/m²'),
        windLoad: this.fmt(ts.windLoad, 'kN/m²'),
        craneLoad: q.craneCapacity ? `${q.craneCapacity} MT` : 'N/A',
        mezzanineLoad: ts.mezzanineLoad ? `${ts.mezzanineLoad} kN/m²` : 'N/A',
      },

      crane: {
        required: q.craneRequired || sc.crane?.state === 'Included' || false,
        capacity: q.craneCapacity ? `${q.craneCapacity} MT` : 'N/A',
        type: q.craneType || 'Electric Overhead Traveling (EOT)',
      },

      mezzanine: {
        required: q.mezzanine || sc.civilWork?.state === 'Included' || false,
        area: this.fmt(q.mezzanineArea || ts.mezzanineArea, 'sqm'),
        load: this.fmt(ts.mezzanineLoad, 'kN/m²'),
      },

      accessories: {
        roofAccessories: this.buildAccessoriesList(ts, 'roof'),
        wallAccessories: this.buildAccessoriesList(ts, 'wall'),
      },

      materials: this.mapMaterials(q.materialSelections || [], pc),

      pricing: {
        materialCost: this.fmtCurrency(
          pc.materialRates?.reduce((s: number, m: any) => s + (m.amount || 0), 0) || q.materialCost,
        ),
        labourCost: this.fmtCurrency(pc.labourCost || q.labourCost),
        installationCost: this.fmtCurrency(pc.installationCost || q.installationCost),
        transportationCost: this.fmtCurrency(pc.transportationCost || q.transportationCost),
        craneCost: this.fmtCurrency(pc.craneCost || q.craneCost),
        civilCost: this.fmtCurrency(pc.civilCost || q.civilCost),
        accommodationCost: this.fmtCurrency(pc.accommodationCost || q.accommodationCost),
        erectionCost: this.fmtCurrency(pc.erectionCost || q.erectionCost),
        freightCost: this.fmtCurrency(pc.freightCost || q.freightCost),
        otherCosts: this.fmtCurrency(
          (pc.additionalServiceCosts || []).reduce((s: number, c: any) => s + (c.cost || 0), 0) +
            (q.otherCosts || 0),
        ),
        subtotal: this.fmtCurrency(q.subtotal),
        markupPercentage: pc.markupPercentage ? `${pc.markupPercentage}%` : '',
        discountType: pc.discountType || q.discountType || 'none',
        discountValue: pc.discountValue ? `${pc.discountValue}` : '0',
        discountAmount: this.fmtCurrency(q.discountAmount),
        gstType: pc.gstType || q.gstType || 'CGST',
        gstRate: `${pc.gstRate || q.gstRate || 18}%`,
        taxAmount: this.fmtCurrency(q.taxAmount),
        grandTotal: this.fmtCurrency(q.grandTotal),
        currency: pc.currency || q.currency || 'INR',
        amountInWords: q.amountInWords || this.numberToWords(q.grandTotal || 0),
      },

      payment: {
        terms: q.paymentTerms || 'As per agreement',
        bankName: q.bankName || '',
        accountNumber: q.accountNumber || '',
        ifscCode: q.ifscCode || '',
        branchName: q.bankBranch || '',
        accountType: q.accountType || 'Current Account',
      },

      delivery: {
        terms: q.deliveryTerms || '',
        estimatedDuration: tl.estimatedDuration
          ? `${tl.estimatedDuration} ${tl.unit || 'weeks'}`
          : '4-6 weeks',
        milestones: (tl.milestones || []).map((m: any) => ({
          milestone: m.milestone || '',
          estimatedDate: m.estimatedDate ? this.formatDate(m.estimatedDate) : '',
        })),
      },

      inclusions: q.inclusions || [],
      exclusions: q.exclusions || [],
      termsAndConditions: q.termsAndConditions || '',
      notes: q.notes || '',

      branding: {
        coverImage: branding.coverImage ? this.loadLogoAsDataUri(branding.coverImage) : '',
        watermarkImage: branding.watermarkImage
          ? this.loadLogoAsDataUri(branding.watermarkImage)
          : '',
        watermarkOpacity: branding.watermarkOpacity,
        watermarkSize: branding.watermarkSize,
        watermarkPosition: branding.watermarkPosition,
        headerLogo: branding.headerLogo ? this.loadLogoAsDataUri(branding.headerLogo) : '',
        footerLogo: branding.footerLogo ? this.loadLogoAsDataUri(branding.footerLogo) : '',
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
      },
    };
  }

  /**
   * Generate PDF from view model. Delegates to HtmlPdfService (with browser pooling).
   */
  async generatePdf(viewModel: PdfQuotationViewModel): Promise<Buffer> {
    return this.htmlPdfService.generatePdf(
      'quotation-v1',
      viewModel as unknown as Record<string, unknown>,
    );
  }

  /**
   * Fetch quotation data by ID with organization validation.
   * Queries the Quotation table directly (requires Quotation model in schema).
   */
  async fetchQuotation(id: string, organizationId: string): Promise<Record<string, any>> {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, organizationId, isDeleted: false },
    });

    if (quotation) {
      return {
        ...quotation,
        _organization: await this.getOrganizationForQuotation(organizationId),
      };
    }

    throw new NotFoundException(`Quotation not found: ${id}`);
  }

  private async getOrganizationForQuotation(organizationId: string) {
    return this.prisma.organization.findFirst({
      where: { id: organizationId, isDeleted: false },
      select: {
        name: true,
        email: true,
        mobile: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        gstNumber: true,
        website: true,
      },
    });
  }

  // ─── Helper Methods ───────────────────────────────────────────────────────

  private formatDate(date: Date | string | null | undefined): string {
    if (!date) return '';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }

  private fmt(value: number | null | undefined, unit: string): string {
    if (value === null || value === undefined) return '';
    return `${value} ${unit}`;
  }

  private fmtCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) return '₹ 0.00';
    const absAmount = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    const formatted = this.formatIndianNumber(absAmount);
    return `${sign}₹ ${formatted}`;
  }

  private formatIndianNumber(num: number): string {
    const parts = num.toFixed(2).split('.');
    let intPart = parts[0];
    const decPart = parts[1];
    if (intPart.length > 3) {
      const last3 = intPart.slice(-3);
      const rest = intPart.slice(0, -3);
      const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      intPart = formatted + ',' + last3;
    }
    return intPart + '.' + decPart;
  }

  private mapMaterials(selections: any[], pricingConfig: any): PdfQuotationViewModel['materials'] {
    return selections.map((s: any, idx: number) => {
      const rate = pricingConfig?.materialRates?.find((m: any) => m.materialSelectionId === s.id);
      return {
        sno: idx + 1,
        itemName: s.itemName || s.name || '',
        specification: s.specification || s.customDescription || '',
        quantity: s.quantity ? String(s.quantity) : '',
        unit: s.unit || '',
        rate: rate?.rate ? this.fmtCurrency(rate.rate) : s.rate ? this.fmtCurrency(s.rate) : '',
        amount: rate?.amount
          ? this.fmtCurrency(rate.amount)
          : s.amount
            ? this.fmtCurrency(s.amount)
            : '',
      };
    });
  }

  private buildAccessoriesList(ts: any, type: 'roof' | 'wall'): string[] {
    const accessories: string[] = [];
    if (type === 'roof') {
      if (ts.gutters) accessories.push('Gutters');
      if (ts.downspouts) accessories.push('Downspouts');
      if (ts.skylights) accessories.push(`${ts.skylights} Skylights`);
      if (ts.ridgeVentilators) accessories.push(`${ts.ridgeVentilators} Ridge Ventilators`);
      if (ts.roofAccessories) {
        if (Array.isArray(ts.roofAccessories)) {
          accessories.push(...ts.roofAccessories);
        } else if (typeof ts.roofAccessories === 'string') {
          accessories.push(ts.roofAccessories);
        }
      }
    } else {
      if (ts.overheadDoors) accessories.push(`${ts.overheadDoors} Overhead Doors`);
      if (ts.walkDoors) accessories.push(`${ts.walkDoors} Walk Doors`);
      if (ts.windows) accessories.push(`${ts.windows} Windows`);
      if (ts.wallAccessories) {
        if (Array.isArray(ts.wallAccessories)) {
          accessories.push(...ts.wallAccessories);
        } else if (typeof ts.wallAccessories === 'string') {
          accessories.push(ts.wallAccessories);
        }
      }
    }
    return accessories;
  }

  private numberToWords(num: number): string {
    if (!num || num === 0) return 'Zero';

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

    const convertBelow1000 = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return (
        ones[Math.floor(n / 100)] +
        ' Hundred' +
        (n % 100 ? ' and ' + convertBelow1000(n % 100) : '')
      );
    };

    const convert = (n: number): string => {
      if (n === 0) return '';
      if (n < 1000) return convertBelow1000(n);
      if (n < 100000)
        return (
          convertBelow1000(Math.floor(n / 1000)) +
          ' Thousand' +
          (n % 1000 ? ' ' + convert(n % 1000) : '')
        );
      if (n < 10000000)
        return (
          convertBelow1000(Math.floor(n / 100000)) +
          ' Lakh' +
          (n % 100000 ? ' ' + convert(n % 100000) : '')
        );
      return (
        convertBelow1000(Math.floor(n / 10000000)) +
        ' Crore' +
        (n % 10000000 ? ' ' + convert(n % 10000000) : '')
      );
    };

    const value = Math.abs(Math.round(num * 100) / 100);
    const rupees = Math.floor(value);
    const paise = Math.round((value - rupees) * 100);
    let result = 'Rupees ' + (convert(rupees) || 'Zero');
    if (paise > 0) {
      result += ' and Paise ' + convert(paise);
    }
    return result + ' Only';
  }
}
