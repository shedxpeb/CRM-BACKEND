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
  coverImageData: string;
  meta: {
    quotationNumber: string;
    date: string;
    validUntil: string;
    generatedAt: string;
    version: number;
    inquiryNumber: string;
    quotationDate: string;
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
    gstNumber: string;
  };

  preparedBy: {
    name: string;
    designation: string;
    company: string;
    address: string;
    gstin: string;
    mobile: string;
    email: string;
  };

  subject: string;
  introduction: string;
  signature: {
    prefix: string;
    name: string;
    designation: string;
    mobile: string;
    email: string;
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
    frameType: string;
    endFrameCondition: string;
    widthModule: string;
    opening: string;
    endwallBaySpacing: string;
    brickwallCondition: string;
    canopy: string;
    roofSheeting: string;
    wallSheeting: string;
    gutter: string;
    downTakePipe: string;
    bracingType: string;
    fascia: string;
    futureExpansion: string;
  };

  design: {
    designCode: string;
    windLoadApplication: string;
    seismicCode: string;
    responseFactor: string;
    importanceFactor: string;
    seismicZone: string;
    seismicCoefficient: string;
    windLoad: string;
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
    columnLoad: string;
    collateralLoad: string;
    craneLoad: string;
    mezzanineLoad: string;
  };

  crane: {
    required: boolean;
    capacity: string;
    numberOfCranes: string;
    span: string;
    trolleyHoistWeight: string;
    craneWeight: string;
    wheelLoad: string;
    wheelBase: string;
    runLength: string;
    topOfCraneBeam: string;
    tandemOperation: string;
  };

  mezzanine: {
    required: boolean;
    area: string;
    load: string;
    thicknessOfSlab: string;
    liveLoad: string;
    additionalLoad: string;
    stairCase: string;
    deflection: string;
    topOfSlab: string;
    shearStud: string;
  };

  accessories: {
    roofAccessories: Array<{
      description: string;
      size: string;
      quantity: string;
      location: string;
    }>;
    wallAccessories: Array<{
      description: string;
      size: string;
      quantity: string;
      location: string;
    }>;
  };

  materials: Array<{
    sno: number;
    component: string;
    specification: string;
    make: string;
    yieldStrength: string;
    quantity: string;
    unit: string;
    rate: string;
    amount: string;
  }>;

  weightSummary: Array<{
    description: string;
    weight: string;
    unit: string;
    remarks: string;
  }>;

  designWeightSummary: Array<{
    id: string;
    description: string;
    weightInMT: string;
    remarks: string;
  }>;

  pricing: {
    lineItems: Array<{
      sno: number;
      description: string;
      unit: string;
      quantity: string;
      amount: string;
    }>;
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
    address: string;
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
  craneCapacityMt: string;
  finalSignature: {
    name: string;
    mobile: string;
    company: string;
  };
  roofAccessories: Array<{
    id: string;
    description: string;
    size: string;
    quantity: string;
    location: string;
  }>;
  wallAccessories: Array<{
    id: string;
    description: string;
    size: string;
    quantity: string;
    location: string;
  }>;
  materialSpecs: Array<{
    id: string;
    component: string;
    specification: string;
    make: string;
    yieldStrength: string;
    isChild?: boolean;
    parentId?: string;
  }>;
  contractPriceRows: Array<{
    id: string;
    serialNo: number;
    description: string;
    unit: string;
    quantity: string;
    rate: string;
    amount: number;
  }>;
  contractPrice: {
    basicTotal: number;
    gstRate: number;
    gstAmount: number;
    grandTotal: number;
  };

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

  templateDefaults?: {
    subject?: string;
    introduction?: string;
    applicableCodes?: string[];
    primaryStructuralMembers?: string[];
    secondaryStructuralMembers?: string[];
    notes?: string;
    specialTechnicalAssumptions?: string[];
    paymentTerms?: string;
    bankDetails?: {
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      address?: string;
    };
    exclusions?: string[];
    deliverySchedule?: string[];
    otherCommercialTerms?: string[];
    cancellations?: string;
    productionRelease?: string;
    warranty?: string;
    governingLaw?: string;
    taxesAndDuties?: string;
    signature?: {
      name?: string;
      designation?: string;
    };
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
    Handlebars.registerHelper('formatIndianCurrency', (value: number) => {
      if (typeof value !== 'number' || isNaN(value) || value === 0) return '';
      return value.toLocaleString('en-IN');
    });
    Handlebars.registerHelper('add', (a: number, b: number) => (a || 0) + (b || 0));
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
      this.logger.warn(`Failed to load logo from ${logoPath}: ${error}`);
    }
    return '';
  }

  /**
   * Load the quotation cover image as a base64 data URI.
   * The cover image is located at frontend/public/quotation-assets/first.jpg
   */
  loadCoverImageAsDataUri(): string {
    const coverImagePath = path.join(process.cwd(), '..', 'frontend', 'public', 'quotation-assets', 'first.jpg');
    
    // Check cache
    const cacheKey = `cover-image:${coverImagePath}`;
    const cached = this.assetCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.dataUri;
    }

    // Load from filesystem
    try {
      if (!fs.existsSync(coverImagePath)) {
        throw new Error(`Quotation cover image missing: ${coverImagePath}`);
      }
      
      const buffer = fs.readFileSync(coverImagePath);
      const dataUri = `data:image/jpeg;base64,${buffer.toString('base64')}`;

      // Cache it
      this.assetCache.set(cacheKey, {
        dataUri,
        expiresAt: Date.now() + this.ASSET_CACHE_TTL_MS,
      });
      return dataUri;
    } catch (error) {
      this.logger.error(`Failed to load cover image: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Quotation cover image missing: frontend/public/quotation-assets/first.jpg`);
    }
  }

  /**
   * Load the watermark image as a base64 data URI.
   * The watermark image is located at frontend/public/quotation-assets/watermark.png
   */
  loadWatermarkImageAsDataUri(): string {
    const watermarkPath = path.join(process.cwd(), '..', 'frontend', 'public', 'quotation-assets', 'watermark.png');
    
    // Check cache
    const cacheKey = `watermark-image:${watermarkPath}`;
    const cached = this.assetCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.dataUri;
    }

    // Load from filesystem
    try {
      if (!fs.existsSync(watermarkPath)) {
        this.logger.warn(`Watermark image not found: ${watermarkPath}`);
        return '';
      }
      
      const buffer = fs.readFileSync(watermarkPath);
      const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;

      // Cache it
      this.assetCache.set(cacheKey, {
        dataUri,
        expiresAt: Date.now() + this.ASSET_CACHE_TTL_MS,
      });
      return dataUri;
    } catch (error) {
      this.logger.warn(`Failed to load watermark image: ${error instanceof Error ? error.message : String(error)}`);
      return '';
    }
  }

  /**
   * Map raw quotation data to the normalized PDF view model.
   */
  private mapToViewModel(q: Record<string, any>, branding: PdfBrandingContext): PdfQuotationViewModel {
    const templateDefaults = (q._organization as any)?.quotationTemplateDefaults || {};
    const techSpecs = q.technicalSpecifications as any || {};
    const scopeConfig = q.scopeConfiguration as Record<string, any> || {};
    const pc = q.pricingConfiguration as Record<string, any> || {};
    const org = q._organization || {};

    // Debug logging for row counts before mapping
    this.logger.log(`[mapToViewModel] === INPUT DATA INSPECTION ===`);
    this.logger.log(`[mapToViewModel] Quotation ID: ${q.id}`);
    this.logger.log(`[mapToViewModel] Roof Accessories: ${Array.isArray(q.roofAccessories) ? q.roofAccessories.length : 0}`);
    this.logger.log(`[mapToViewModel] Wall Accessories: ${Array.isArray(q.wallAccessories) ? q.wallAccessories.length : 0}`);
    this.logger.log(`[mapToViewModel] Material Specs: ${Array.isArray(q.materialSpecs) ? q.materialSpecs.length : 0}`);
    this.logger.log(`[mapToViewModel] Contract Price Rows: ${Array.isArray(q.contractPriceRows) ? q.contractPriceRows.length : 0}`);
    
    // Log contract price rows details if present
    if (Array.isArray(q.contractPriceRows) && q.contractPriceRows.length > 0) {
      this.logger.log(`[mapToViewModel] Contract Price Rows details:`);
      q.contractPriceRows.forEach((row: any, idx: number) => {
        this.logger.log(`[mapToViewModel] Row ${idx}: serialNo=${row.serialNo}, description=${row.description?.substring(0, 50)}..., qty=${row.quantity}, rate=${row.rate}, amount=${row.amount})`);
      });
    } else {
      this.logger.warn(`[mapToViewModel] WARNING: contractPriceRows is empty or not an array. Type: ${typeof q.contractPriceRows}, Value: ${JSON.stringify(q.contractPriceRows)}`);
    }

    // Row count validation
    const roofCount = Array.isArray(q.roofAccessories) ? q.roofAccessories.length : 0;
    const wallCount = Array.isArray(q.wallAccessories) ? q.wallAccessories.length : 0;
    const materialCount = Array.isArray(q.materialSpecs) ? q.materialSpecs.length : 0;
    const contractPriceCount = Array.isArray(q.contractPriceRows) ? q.contractPriceRows.length : 0;

    if (roofCount === 0) this.logger.warn(`[mapToViewModel] WARNING: Roof Accessories count is 0`);
    if (wallCount === 0) this.logger.warn(`[mapToViewModel] WARNING: Wall Accessories count is 0`);
    if (materialCount === 0) this.logger.warn(`[mapToViewModel] WARNING: Material Specs count is 0`);
    if (contractPriceCount === 0) this.logger.warn(`[mapToViewModel] WARNING: Contract Price Rows count is 0`);

    this.logger.log('[mapToViewModel] Customer Name:', q.customerName);

    // Technical specifications are stored as flat fields, not nested objects
    const buildingSpec = {
      frameType: techSpecs.frameType,
      endFrameCondition: techSpecs.endFrameCondition,
      width: techSpecs.buildingWidth,
      length: techSpecs.buildingLength,
      clearHeight: techSpecs.buildingHeight,
      widthModule: techSpecs.widthModule,
      roofSlope: techSpecs.roofSlope,
      opening: techSpecs.opening,
      sidewallBaySpacing: techSpecs.baySpacing,
      endwallBaySpacing: techSpecs.endwallBaySpacing,
      brickwallCondition: techSpecs.brickwallCondition,
      canopy: techSpecs.canopy,
      roofSheeting: techSpecs.roofSheeting,
      wallSheeting: techSpecs.wallSheeting,
      gutter: techSpecs.gutter,
      downTakePipe: techSpecs.downTakePipe,
      bracingType: techSpecs.bracingType,
      fascia: techSpecs.fascia,
      futureExpansion: techSpecs.futureExpansion,
    };

    const designCode = {
      windLoadApplication: techSpecs.designCode,
      seismicCode: techSpecs.seismicCode,
      responseFactor: techSpecs.responseFactor,
      importanceFactor: techSpecs.importanceFactor,
      seismicZone: techSpecs.seismicZone,
      seismicCoefficient: techSpecs.seismicCoefficient,
    };

    const designLoad = {
      deadLoad: techSpecs.deadLoad,
      liveLoad: techSpecs.liveLoad,
      windSpeed: techSpecs.windLoad,
      columnLoad: techSpecs.columnLoad,
      collateralLoad: techSpecs.collateralLoad,
    };

    const mezzanineLoad = {
      mezzArea: techSpecs.mezzanineArea,
      mezzLiveLoad: techSpecs.mezzanineLoad,
      thicknessOfSlab: techSpecs.thicknessOfSlab,
      mezzAdditionalLoad: techSpecs.mezzanineAdditionalLoad,
      stairCase: techSpecs.stairCase,
      deflection: techSpecs.deflection,
      topOfSlab: techSpecs.topOfMezzanineSlab,
      shearStud: techSpecs.shearStud,
    };

    const craneDetail = {
      craneCapacity: techSpecs.craneCapacity,
      noOfCranes: techSpecs.numberOfCranes,
      craneSpan: techSpecs.craneSpan,
      trolleyHoistWeight: techSpecs.trolleyHoistWeight,
      craneWeight: techSpecs.craneWeight,
      wheelLoad: techSpecs.wheelLoad,
      wheelBase: techSpecs.wheelBase,
      runLength: techSpecs.runLength,
      topOfCraneBeam: techSpecs.topOfCraneBeam,
      tandemOperation: techSpecs.tandemOperation,
    };

    // Debug logging to trace actual data structure
    this.logger.log('[mapToViewModel] Quotation ID:', q.id);
    this.logger.log('[mapToViewModel] Quotation Number:', q.quotationNumber);
    this.logger.log('[mapToViewModel] Inquiry Number:', q.inquiryNumber);
    this.logger.log('[mapToViewModel] Date:', q.date);
    this.logger.log('[mapToViewModel] Created At:', q.createdAt);
    this.logger.log('[mapToViewModel] Customer Name:', q.customerName);
    this.logger.log('[mapToViewModel] Customer Address:', q.customerAddress);
    this.logger.log('[mapToViewModel] Customer GST:', q.customerGST);
    this.logger.log('[mapToViewModel] Customer ID:', q.customerId);
    this.logger.log('[mapToViewModel] Organization Name:', org.name);
    this.logger.log('[mapToViewModel] Organization Settings:', JSON.stringify(org.settings));
    this.logger.log('[mapToViewModel] Technical Specifications (flat):', JSON.stringify(techSpecs));
    this.logger.log('[mapToViewModel] Material Specs:', JSON.stringify(techSpecs.materialSpecs));
    this.logger.log('[mapToViewModel] Roof Accessories:', JSON.stringify(techSpecs.roofAccessories));
    this.logger.log('[mapToViewModel] Wall Accessories:', JSON.stringify(techSpecs.wallAccessories));
    this.logger.log('[mapToViewModel] Weight Rows:', JSON.stringify(techSpecs.weightRows));
    this.logger.log('[mapToViewModel] Pricing Configuration:', JSON.stringify(pc));

    // Logo resolution
    const logoDataUri = this.loadLogoAsDataUri(branding.companyLogo);

    // Cover image resolution
    const coverImageDataUri = this.loadCoverImageAsDataUri();

    const viewModel = {
      coverImageData: coverImageDataUri,
      meta: {
        quotationNumber: q.quotationNumber || 'N/A',
        date: this.formatDate(q.date || q.createdAt),
        validUntil: q.validUntil ? this.formatDate(q.validUntil) : 'N/A',
        generatedAt: this.formatDate(new Date()),
        version: q.version || 1,
        inquiryNumber: q.inquiryNumber || '',
        quotationDate: this.formatDate(q.date || q.createdAt),
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
        gstNumber: q.customerGST || '',
      },

      preparedBy: {
        name: q.preparedByName || q.createdBy || q.salesExecutive || '',
        designation: q.preparedByDesignation || q.authorizedDesignation || 'Authorized Signatory',
        company: q.preparedByCompany || branding.companyName || org.name || '',
        address: q.preparedByAddress || org.address || '',
        gstin: q.preparedByGstin || org.gstNumber || '',
        mobile: q.preparedByMobile || '',
        email: q.preparedByEmail || org.email || '',
      },

      subject: q.subject || templateDefaults?.subject || 'Techno Commercial Offer for Design Supply of PEB Building.',
      introduction: q.introduction || templateDefaults?.introduction || 'We Thank you for valued enquiry for Pre engineering building Steel Structure and giving us opportunity to submit a Proposal to your valuable project in a cost-effective manner.\n\nThis Proposal to you is based on steels standard design criteria and specifications. However, the overall dimensions and layout are in General accordance with your enquiry or Drawings Given by you.\n\nKindly note that we have tried our utmost to assure that this proposal meets all your project requirements and specifications. However, in some case we had to make some assumptions, suggest certain deviations and exclude some items that you may have requested.\n\nWe hope you will find the same in order, awaiting your kind reply & esteemed order.',
      signature: {
        prefix: q.signaturePrefix || 'Sincerely Yours,',
        name: q.signatureName || templateDefaults?.signature?.name || q.preparedByName || 'VIKAS GONDALIYA',
        designation: q.signatureDesignation || templateDefaults?.signature?.designation || q.preparedByDesignation || 'Director For Shedx Peb LLP.',
        mobile: q.signatureMobile || q.preparedByMobile || '6359998111',
        email: q.signatureEmail || q.preparedByEmail || 'Sales@shedxpeb.com',
      },

      project: {
        projectName: q.projectName || '',
        projectType: q.projectType || '',
        structureType: q.structureType || '',
      },

      building: {
        length: this.normalizeString(buildingSpec.length),
        width: this.normalizeString(buildingSpec.width),
        height: this.normalizeString(buildingSpec.clearHeight),
        area: '',
        baySpacing: this.normalizeString(buildingSpec.sidewallBaySpacing),
        roofSlope: this.normalizeString(buildingSpec.roofSlope),
        frameType: this.normalizeString(buildingSpec.frameType),
        endFrameCondition: this.normalizeString(buildingSpec.endFrameCondition),
        widthModule: this.normalizeString(buildingSpec.widthModule),
        opening: this.normalizeString(buildingSpec.opening),
        endwallBaySpacing: this.normalizeString(buildingSpec.endwallBaySpacing),
        brickwallCondition: this.normalizeString(buildingSpec.brickwallCondition),
        canopy: this.normalizeString(buildingSpec.canopy),
        roofSheeting: this.normalizeString(buildingSpec.roofSheeting),
        wallSheeting: this.normalizeString(buildingSpec.wallSheeting),
        gutter: this.normalizeString(buildingSpec.gutter),
        downTakePipe: this.normalizeString(buildingSpec.downTakePipe),
        bracingType: this.normalizeString(buildingSpec.bracingType),
        fascia: this.normalizeString(buildingSpec.fascia),
        futureExpansion: this.normalizeString(buildingSpec.futureExpansion),
      },

      design: {
        designCode: this.normalizeString(designCode.windLoadApplication),
        windLoadApplication: this.normalizeString(designCode.windLoadApplication),
        seismicCode: this.normalizeString(designCode.seismicCode),
        responseFactor: this.normalizeString(designCode.responseFactor),
        importanceFactor: this.normalizeString(designCode.importanceFactor),
        seismicZone: this.normalizeString(designCode.seismicZone),
        seismicCoefficient: this.normalizeString(designCode.seismicCoefficient),
        windLoad: this.normalizeString(designLoad.windSpeed),
        roofCladding: '',
        wallCladding: '',
        insulationType: '',
        insulationThickness: '',
        roofSlope: this.normalizeString(buildingSpec.roofSlope),
      },

      loads: {
        deadLoad: this.normalizeString(designLoad.deadLoad),
        liveLoad: this.normalizeString(designLoad.liveLoad),
        windLoad: this.normalizeString(designLoad.windSpeed),
        columnLoad: this.normalizeString(designLoad.columnLoad),
        collateralLoad: this.normalizeString(designLoad.collateralLoad),
        craneLoad: craneDetail?.craneCapacity ? `${this.normalizeString(craneDetail.craneCapacity)} MT` : 'N/A',
        mezzanineLoad: mezzanineLoad?.mezzLiveLoad ? `${this.normalizeString(mezzanineLoad.mezzLiveLoad)} kN/m²` : 'N/A',
      },

      crane: {
        required: !!craneDetail,
        capacity: this.normalizeString(craneDetail?.craneCapacity) || 'N/A',
        numberOfCranes: this.normalizeString(craneDetail?.noOfCranes) || 'N/A',
        span: this.normalizeString(craneDetail?.craneSpan) || 'N/A',
        trolleyHoistWeight: this.normalizeString(craneDetail?.trolleyHoistWeight) || '-',
        craneWeight: this.normalizeString(craneDetail?.craneWeight) || '-',
        wheelLoad: this.normalizeString(craneDetail?.wheelLoad) || '-',
        wheelBase: this.normalizeString(craneDetail?.wheelBase) || '-',
        runLength: this.normalizeString(craneDetail?.runLength) || '-',
        topOfCraneBeam: this.normalizeString(craneDetail?.topOfCraneBeam) || 'L/600',
        tandemOperation: this.normalizeString(craneDetail?.tandemOperation) || '-',
      },

      mezzanine: {
        required: !!mezzanineLoad,
        area: this.normalizeString(mezzanineLoad?.mezzArea),
        load: this.normalizeString(mezzanineLoad?.mezzLiveLoad),
        thicknessOfSlab: this.normalizeString(mezzanineLoad?.thicknessOfSlab),
        liveLoad: this.normalizeString(mezzanineLoad?.mezzLiveLoad),
        additionalLoad: this.normalizeString(mezzanineLoad?.mezzAdditionalLoad),
        stairCase: this.normalizeString(mezzanineLoad?.stairCase),
        deflection: this.normalizeString(mezzanineLoad?.deflection),
        topOfSlab: this.normalizeString(mezzanineLoad?.topOfSlab),
        shearStud: this.normalizeString(mezzanineLoad?.shearStud),
      },

      accessories: {
        roofAccessories: (q.inclusions as any[] || []).map((item: any) => ({
          description: this.normalizeString(item.description),
          size: this.normalizeString(item.size),
          quantity: this.normalizeString(item.quantity),
          location: this.normalizeString(item.location),
        })),
        wallAccessories: (q.exclusions as any[] || []).map((item: any) => ({
          description: this.normalizeString(item.description),
          size: this.normalizeString(item.size),
          quantity: this.normalizeString(item.quantity),
          location: this.normalizeString(item.location),
        })),
      },

      materials: this.mapMaterials(techSpecs.materialSpecs || [], pc),

      weightSummary: (techSpecs.weightRows || []).map((item: any, index: number) => ({
        description: this.normalizeString(item.description),
        weight: this.normalizeString(item.weight),
        unit: this.normalizeString(item.unit) || 'MT',
        remarks: this.normalizeString(item.remarks),
      })),

      pricing: {
        lineItems: [
          { sno: 1, description: 'Material Cost', unit: 'LS', quantity: '1', rate: this.fmtCurrency(q.materialCost), amount: this.fmtCurrency(q.materialCost) },
          { sno: 2, description: 'Labour Cost', unit: 'LS', quantity: '1', rate: this.fmtCurrency(q.labourCost), amount: this.fmtCurrency(q.labourCost) },
          { sno: 3, description: 'Installation Cost', unit: 'LS', quantity: '1', rate: this.fmtCurrency(q.installationCost), amount: this.fmtCurrency(q.installationCost) },
          { sno: 4, description: 'Transportation Cost', unit: 'LS', quantity: '1', rate: this.fmtCurrency(q.transportationCost), amount: this.fmtCurrency(q.transportationCost) },
          { sno: 5, description: 'Crane Cost', unit: 'LS', quantity: '1', rate: this.fmtCurrency(q.craneCost), amount: this.fmtCurrency(q.craneCost) },
          { sno: 6, description: 'Civil Work', unit: 'LS', quantity: '1', rate: this.fmtCurrency(q.civilCost), amount: this.fmtCurrency(q.civilCost) },
          { sno: 7, description: 'Accommodation', unit: 'LS', quantity: '1', rate: this.fmtCurrency(q.accommodationCost), amount: this.fmtCurrency(q.accommodationCost) },
          { sno: 8, description: 'Erection', unit: 'LS', quantity: '1', rate: this.fmtCurrency(q.erectionCost), amount: this.fmtCurrency(q.erectionCost) },
          { sno: 9, description: 'Freight', unit: 'LS', quantity: '1', rate: this.fmtCurrency(q.freightCost), amount: this.fmtCurrency(q.freightCost) },
        ].filter(item => item.amount !== '₹ 0.00'),
        materialCost: this.fmtCurrency(q.materialCost),
        labourCost: this.fmtCurrency(q.labourCost),
        installationCost: this.fmtCurrency(q.installationCost),
        transportationCost: this.fmtCurrency(q.transportationCost),
        craneCost: this.fmtCurrency(q.craneCost),
        civilCost: this.fmtCurrency(q.civilCost),
        accommodationCost: this.fmtCurrency(q.accommodationCost),
        erectionCost: this.fmtCurrency(q.erectionCost),
        freightCost: this.fmtCurrency(q.freightCost),
        otherCosts: this.fmtCurrency(q.otherCosts),
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
        terms: q.paymentTerms || templateDefaults.paymentTerms || 'As per agreement',
        bankName: templateDefaults.bankDetails?.bankName || q.bankName || '',
        accountNumber: templateDefaults.bankDetails?.accountNumber || q.accountNumber || '',
        ifscCode: templateDefaults.bankDetails?.ifscCode || q.ifscCode || '',
        address: templateDefaults.bankDetails?.address || q.address || '',
        branchName: templateDefaults.bankDetails?.branchName || q.bankBranch || '',
        accountType: templateDefaults.bankDetails?.accountType || q.accountType || 'Current Account',
      },

      craneCapacityMt: this.normalizeString(techSpecs.craneDetail?.craneCapacity?.replace(/[^0-9]/g, '') || '10'),

      finalSignature: {
        name: this.normalizeString(q.finalSignatureName || templateDefaults.signature?.name || 'VIKAS GONDALIYA'),
        mobile: this.normalizeString(q.finalSignatureMobile || templateDefaults.signature?.mobile || '+91 6359998111'),
        company: this.normalizeString(q.finalSignatureCompany || templateDefaults.signature?.company || 'Shedx Peb LLP'),
      },

      roofAccessories: (q.roofAccessories || []).map((acc: any) => ({
        id: acc.id || '',
        description: this.normalizeString(acc.description || ''),
        size: this.normalizeString(acc.size || ''),
        quantity: this.normalizeString(acc.quantity || ''),
        location: this.normalizeString(acc.location || ''),
      })),

      wallAccessories: (q.wallAccessories || []).map((acc: any) => ({
        id: acc.id || '',
        description: this.normalizeString(acc.description || ''),
        size: this.normalizeString(acc.size || ''),
        quantity: this.normalizeString(acc.quantity || ''),
        location: this.normalizeString(acc.location || ''),
      })),

      materialSpecs: (q.materialSpecs || []).map((spec: any) => ({
        id: spec.id || '',
        component: this.normalizeString(spec.component || ''),
        specification: this.normalizeString(spec.specification || ''),
        make: this.normalizeString(spec.make || ''),
        yieldStrength: this.normalizeString(spec.yieldStrength || ''),
        isChild: spec.isChild || false,
        parentId: spec.parentId || '',
      })),

      contractPriceRows: (q.contractPriceRows || []).map((row: any) => ({
        id: row.id || '',
        serialNo: row.serialNo || 0,
        description: this.normalizeString(row.description || ''),
        unit: this.normalizeString(row.unit || ''),
        quantity: this.normalizeString(row.quantity || ''),
        rate: this.normalizeString(row.rate || ''),
        amount: row.amount || 0,
      })),

      // Calculate totals from contractPriceRows
      contractPrice: (() => {
        const rows = q.contractPriceRows || [];
        const basicTotal = rows.reduce((sum: number, row: any) => {
          const amount = typeof row.amount === 'number' ? row.amount : 0;
          return sum + amount;
        }, 0);
        const gstRate = 18; // Default GST rate
        const gstAmount = (basicTotal * gstRate) / 100;
        const grandTotal = basicTotal + gstAmount;

        return {
          basicTotal,
          gstRate,
          gstAmount,
          grandTotal,
        };
      })(),

      // Design Weight Summary for Page 7
      designWeightSummary: (q.designWeightSummary || []).map((row: any) => ({
        id: row.id || '',
        description: this.normalizeString(row.description || ''),
        weightInMT: this.normalizeString(String(row.weightInMT || '')),
        remarks: this.normalizeString(row.remarks || ''),
      })),

      delivery: {
        terms: q.deliveryTerms || '',
        estimatedDuration: '4-6 weeks',
        milestones: [],
      },

      inclusions: templateDefaults.inclusions || q.inclusions || [],
      exclusions: templateDefaults.exclusions || q.exclusions || [],
      termsAndConditions: templateDefaults.termsAndConditions || q.termsAndConditions || '',
      notes: templateDefaults.notes || q.notes || '',

      branding: {
        coverImage: this.normalizeString(branding.coverImage ? this.loadLogoAsDataUri(branding.coverImage) : this.loadCoverImageAsDataUri()),
        watermarkImage: this.normalizeString(branding.watermarkImage
          ? this.loadLogoAsDataUri(branding.watermarkImage)
          : this.loadWatermarkImageAsDataUri()),
        watermarkOpacity: branding.watermarkOpacity || 0.05,
        watermarkSize: this.normalizeString(branding.watermarkSize),
        watermarkPosition: this.normalizeString(branding.watermarkPosition),
        headerLogo: this.normalizeString(branding.headerLogo ? this.loadLogoAsDataUri(branding.headerLogo) : ''),
        footerLogo: this.normalizeString(branding.footerLogo ? this.loadLogoAsDataUri(branding.footerLogo) : ''),
        primaryColor: this.normalizeString(branding.primaryColor),
        secondaryColor: this.normalizeString(branding.secondaryColor),
      },

      templateDefaults: {
        subject: templateDefaults.subject || 'Techno Commercial Offer for Design Supply of PEB Building.',
        introduction: templateDefaults.introduction || '',
        applicableCodes: templateDefaults.applicableCodes || [],
        primaryStructuralMembers: templateDefaults.primaryStructuralMembers || [],
        secondaryStructuralMembers: templateDefaults.secondaryStructuralMembers || [],
        notes: templateDefaults.notes || '',
        specialTechnicalAssumptions: templateDefaults.specialTechnicalAssumptions || [],
        paymentTerms: templateDefaults.paymentTerms || '',
        bankDetails: templateDefaults.bankDetails || {},
        exclusions: templateDefaults.exclusions || [],
        deliverySchedule: templateDefaults.deliverySchedule || [],
        otherCommercialTerms: templateDefaults.otherCommercialTerms || [],
        cancellations: templateDefaults.cancellations || '',
        productionRelease: templateDefaults.productionRelease || '',
        warranty: templateDefaults.warranty || '',
        governingLaw: templateDefaults.governingLaw || '',
        taxesAndDuties: templateDefaults.taxesAndDuties || '',
        signature: templateDefaults.signature || {},
      },
    };

    // Diagnostic: Log designWeightSummary data
    this.logger.log(`[PDF DEBUG] designWeightSummary rows in view model: ${viewModel.designWeightSummary.length}`);
    if (viewModel.designWeightSummary.length > 0) {
      this.logger.log(`[PDF DEBUG] First designWeight row: ${JSON.stringify(viewModel.designWeightSummary[0])}`);
    }

    return viewModel;
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
   * Reload PDF templates (delegates to HtmlPdfService).
   * Useful for development after template changes.
   */
  reloadTemplates() {
    this.htmlPdfService.reloadTemplates();
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
      // Extract technical specifications JSON
      const techSpecs = quotation.technicalSpecifications as any || {};
      const proposalConfig = quotation.proposalConfiguration as any || {};
      
      // Debug logging to track row counts from both sources
      this.logger.log(`[fetchQuotation] Quotation ID: ${id}`);
      this.logger.log(`[fetchQuotation] Inquiry Number: ${quotation.inquiryNumber}`);
      this.logger.log(`[fetchQuotation] === TECHNICAL SPECIFICATIONS ===`);
      this.logger.log(`[fetchQuotation] Roof Accessories count: ${Array.isArray(techSpecs.roofAccessories) ? techSpecs.roofAccessories.length : 0}`);
      this.logger.log(`[fetchQuotation] Wall Accessories count: ${Array.isArray(techSpecs.wallAccessories) ? techSpecs.wallAccessories.length : 0}`);
      this.logger.log(`[fetchQuotation] Material Specs count: ${Array.isArray(techSpecs.materialSpecs) ? techSpecs.materialSpecs.length : 0}`);
      this.logger.log(`[fetchQuotation] Contract Price Rows (from technicalSpecifications): ${Array.isArray(techSpecs.contractPriceRows) ? techSpecs.contractPriceRows.length : 0}`);
      this.logger.log(`[fetchQuotation] === PROPOSAL CONFIGURATION ===`);
      this.logger.log(`[fetchQuotation] Contract Price Rows (from proposalConfiguration): ${Array.isArray(proposalConfig.contractPriceRows) ? proposalConfig.contractPriceRows.length : 0}`);
      this.logger.log(`[fetchQuotation] Material Specs (from proposalConfiguration): ${Array.isArray(proposalConfig.materialSpecs) ? proposalConfig.materialSpecs.length : 0}`);
      this.logger.log(`[fetchQuotation] Design Weight Summary count: ${Array.isArray(techSpecs.designWeightSummary) ? techSpecs.designWeightSummary.length : 0}`);

      // Log contract price rows details if present
      if (Array.isArray(techSpecs.contractPriceRows) && techSpecs.contractPriceRows.length > 0) {
        this.logger.log(`[fetchQuotation] Contract Price Rows from technicalSpecifications:`);
        techSpecs.contractPriceRows.forEach((row: any, idx: number) => {
          this.logger.log(`[fetchQuotation] Row ${idx}: serialNo=${row.serialNo}, description=${row.description?.substring(0, 50)}..., qty=${row.quantity}, rate=${row.rate}, amount(${row.amount})`);
        });
      }
      if (Array.isArray(proposalConfig.contractPriceRows) && proposalConfig.contractPriceRows.length > 0) {
        this.logger.log(`[fetchQuotation] Contract Price Rows from proposalConfiguration:`);
        proposalConfig.contractPriceRows.forEach((row: any, idx: number) => {
          this.logger.log(`[fetchQuotation] Row ${idx}: serialNo=${row.serialNo}, description=${row.description?.substring(0, 50)}..., qty=${row.quantity}, rate=${row.rate}, amount=${row.amount})`);
        });
      }

      return {
        ...quotation,
        ...techSpecs, // Flatten technicalSpecifications to top level for easier access
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
        quotationTemplateDefaults: true,
      },
    });
  }

  // ─── Helper Methods ───────────────────────────────────────────────────────

  private normalizeString(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    // Prevent [object Object] rendering
    if (typeof value === 'object') {
      // If it's a nested object with a value property, extract it
      if (value.value !== undefined) return this.normalizeString(value.value);
      // Otherwise return empty string to avoid [object Object]
      return '';
    }
    return String(value);
  }

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
        component: s.component || s.itemName || s.name || '',
        specification: s.specification || s.customDescription || '',
        make: s.make || '',
        yieldStrength: s.yieldStrength || '',
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
