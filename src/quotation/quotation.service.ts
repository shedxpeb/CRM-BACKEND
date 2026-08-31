import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QuotationPdfService } from '../pdf/quotation-pdf.service';

@Injectable()
export class QuotationService {
  private readonly logger = new Logger(QuotationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quotationPdfService: QuotationPdfService,
  ) {}

  // ─── Number Generation ─────────────────────────────────────────────────────

  private async generateQuotationNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();

    const sequence = await this.prisma.$queryRaw<{ sequence: number }[]>`
      INSERT INTO "NumberSequence" ("id", "organizationId", "entityType", "prefix", "year", "sequence", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${organizationId}, 'QUOTATION', 'QTN', ${year}, 1, NOW(), NOW())
      ON CONFLICT ("entityType", "organizationId", "year") DO UPDATE SET "sequence" = "NumberSequence"."sequence" + 1, "updatedAt" = NOW()
      RETURNING "sequence"
    `;

    return `QTN${String(sequence[0].sequence).padStart(6, '0')}`;
  }

  // ─── CRUD Operations ───────────────────────────────────────────────────────

  async findAll(
    organizationId: string,
    page = 1,
    pageSize = 25,
    filters?: { status?: string; customerId?: string; search?: string },
  ) {
    const skip = (page - 1) * pageSize;
    const where: Record<string, any> = {
      organizationId,
      isDeleted: false,
    };

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.search) {
      where.OR = [
        { quotationNumber: { contains: filters.search, mode: 'insensitive' } },
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { projectName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [quotations, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return {
      data: quotations,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string, organizationId: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, organizationId, isDeleted: false },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation not found: ${id}`);
    }

    return quotation;
  }

  async create(
    dto: CreateQuotationDto,
    createdById: string,
    createdBy: string,
    organizationId: string,
  ) {
    const quotationNumber = await this.generateQuotationNumber(organizationId);

    // Fetch customer data if customerId provided
    let customerSnapshot: Record<string, any> = {};
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, organizationId, isDeleted: false },
        select: {
          customerName: true,
          companyName: true,
          email: true,
          mobile: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
          gstNumber: true,
        },
      });
      if (customer) {
        customerSnapshot = {
          customerName: customer.customerName || dto.customerName,
          customerEmail: customer.email || dto.customerEmail,
          customerPhone: customer.mobile || dto.customerPhone,
          customerAddress: customer.address || dto.customerAddress,
          customerCity: customer.city || dto.customerCity,
          customerState: customer.state || dto.customerState,
          customerPincode: customer.pincode || dto.customerPincode,
          customerGST: customer.gstNumber || dto.customerGST,
        };
      }
    }

    // Calculate totals from pricing configuration
    const totals = this.calculateTotals(dto);

    const quotation = await this.prisma.quotation.create({
      data: {
        organizationId,
        quotationNumber,
        proposalId: dto.proposalId,
        proposalNumber: dto.proposalNumber,
        sourceEstimateId: dto.sourceEstimateId,
        sourceEstimateNumber: dto.sourceEstimateNumber,
        customerId: dto.customerId,
        customerName: dto.customerName || customerSnapshot.customerName || '',
        customerEmail: customerSnapshot.customerEmail || dto.customerEmail,
        customerPhone: customerSnapshot.customerPhone || dto.customerPhone,
        customerAddress: customerSnapshot.customerAddress || dto.customerAddress,
        customerCity: customerSnapshot.customerCity || dto.customerCity,
        customerState: customerSnapshot.customerState || dto.customerState,
        customerPincode: customerSnapshot.customerPincode || dto.customerPincode,
        customerGST: customerSnapshot.customerGST || dto.customerGST,
        leadId: dto.leadId,
        projectId: dto.projectId,
        projectName: dto.projectName,
        status: 'Draft',
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        paymentTerms: dto.paymentTerms || '',
        deliveryTerms: dto.deliveryTerms,
        materialSelections: dto.materialSelections || [],
        scopeConfiguration: dto.scopeConfiguration || {},
        technicalSpecifications: dto.technicalSpecifications || {},
        inclusions: dto.inclusions || [],
        exclusions: dto.exclusions || [],
        proposalConfiguration: dto.proposalConfiguration || {},
        timeline: dto.timeline,
        pricingConfiguration: dto.pricingConfiguration || {},
        materialCost: totals.materialCost,
        labourCost: totals.labourCost,
        installationCost: totals.installationCost,
        transportationCost: totals.transportationCost,
        craneCost: totals.craneCost,
        civilCost: totals.civilCost,
        accommodationCost: totals.accommodationCost,
        erectionCost: totals.erectionCost,
        freightCost: totals.freightCost,
        otherCosts: totals.otherCosts,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        discountPercentage: dto.discountPercentage,
        taxAmount: totals.taxAmount,
        gstType: dto.pricingConfiguration?.gstType || 'CGST',
        gstRate: dto.pricingConfiguration?.gstRate || 18,
        grandTotal: totals.grandTotal,
        amountInWords: totals.amountInWords,
        currency: dto.pricingConfiguration?.currency || 'INR',
        termsAndConditions: dto.termsAndConditions,
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        templateId: dto.templateId,
        createdBy,
        createdById,
      },
    });

    this.logger.log(`Quotation created: ${quotation.quotationNumber} in org ${organizationId}`);
    return quotation;
  }

  async update(
    id: string,
    dto: UpdateQuotationDto,
    updatedById: string,
    updatedBy: string,
    organizationId: string,
  ) {
    const existing = await this.findById(id, organizationId);

    // Recalculate totals if pricing changed
    let updateData: Record<string, any> = { ...dto };
    if (dto.pricingConfiguration) {
      const recalculated = this.calculateTotals({
        ...existing,
        ...dto,
      } as any);
      Object.assign(updateData, recalculated);
    }

    const quotation = await this.prisma.quotation.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Quotation updated: ${quotation.quotationNumber}`);
    return quotation;
  }

  async updateStatus(
    id: string,
    status: string,
    userId: string,
    organizationId: string,
  ) {
    const existing = await this.findById(id, organizationId);

    const updateData: Record<string, any> = { status };

    if (status === 'Sent') updateData.sentAt = new Date();
    if (status === 'Viewed') updateData.viewedAt = new Date();
    if (status === 'Accepted') updateData.acceptedAt = new Date();
    if (status === 'Rejected') updateData.rejectedAt = new Date();

    const quotation = await this.prisma.quotation.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Quotation ${quotation.quotationNumber} status: ${status}`);
    return quotation;
  }

  async delete(id: string, deletedById: string, organizationId: string) {
    await this.findById(id, organizationId);

    await this.prisma.quotation.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById,
      },
    });

    this.logger.log(`Quotation deleted: ${id}`);
    return { success: true };
  }

  async convertToProject(id: string, organizationId: string) {
    const quotation = await this.findById(id, organizationId);

    if (quotation.status !== 'Accepted') {
      throw new Error('Only Accepted quotations can be converted to projects');
    }

    const project = await this.prisma.project.create({
      data: {
        organizationId,
        projectName: quotation.projectName || `Project from ${quotation.quotationNumber}`,
        customerId: quotation.customerId || '',
        customerName: quotation.customerName,
        projectType: 'Other',
        location: quotation.customerAddress || '',
        city: (quotation as any).customerCity || '',
        state: (quotation as any).customerState || 'Other',
        priority: 'Medium',
        projectManagerId: quotation.createdById || '',
        projectManager: quotation.createdBy || '',
        structureType: 'PEB',
        roofType: 'MetalSheet',
        craneSystem: 'None',
        wallType: 'MetalSheet',
        status: 'Lead',
        createdById: quotation.createdById || '',
        createdBy: quotation.createdBy || '',
      },
    });

    await this.prisma.quotation.update({
      where: { id },
      data: {
        convertedToProjectId: project.id,
        convertedAt: new Date(),
        status: 'Converted',
      },
    });

    return { project, quotation };
  }

  // ─── PDF Generation ────────────────────────────────────────────────────────

  async generatePdf(id: string, organizationId: string): Promise<Buffer> {
    // 1. Fetch quotation from real database
    const quotation = await this.findById(id, organizationId);

    // 2. Resolve organization branding
    const branding = await this.quotationPdfService.resolveBranding(organizationId);

    // 3. Map to PDF view model (no raw Prisma objects go to template)
    const viewModel = this.quotationPdfService.mapToViewModel(
      quotation as unknown as Record<string, any>,
      branding,
    );

    // 4. Generate PDF via Playwright + Handlebars
    return this.quotationPdfService.generatePdf(viewModel);
  }

  // ─── Pricing Calculation ───────────────────────────────────────────────────

  private calculateTotals(data: {
    pricingConfiguration?: any;
    materialCost?: number;
    labourCost?: number;
    installationCost?: number;
    transportationCost?: number;
    craneCost?: number;
    civilCost?: number;
    accommodationCost?: number;
    erectionCost?: number;
    freightCost?: number;
    otherCosts?: number;
    subtotal?: number;
    discountAmount?: number;
    discountPercentage?: number;
    gstRate?: number;
    gstType?: string;
    grandTotal?: number;
    taxAmount?: number;
    amountInWords?: string;
  }) {
    const pc = data.pricingConfiguration || {};

    const materialCost =
      data.materialCost ??
      pc.materialRates?.reduce((s: number, m: any) => s + (m.amount || 0), 0) ??
      0;

    const labourCost = data.labourCost ?? pc.labourCost ?? 0;
    const installationCost = data.installationCost ?? pc.installationCost ?? 0;
    const transportationCost = data.transportationCost ?? pc.transportationCost ?? 0;
    const craneCost = data.craneCost ?? pc.craneCost ?? 0;
    const civilCost = data.civilCost ?? pc.civilCost ?? 0;
    const accommodationCost = data.accommodationCost ?? pc.accommodationCost ?? 0;
    const erectionCost = data.erectionCost ?? pc.erectionCost ?? 0;
    const freightCost = data.freightCost ?? pc.freightCost ?? 0;

    const additionalCosts =
      pc.additionalServiceCosts?.reduce((s: number, c: any) => s + (c.cost || 0), 0) ?? 0;
    const otherCosts = (data.otherCosts ?? 0) + additionalCosts;

    const subtotal =
      data.subtotal ??
      materialCost + labourCost + installationCost + transportationCost + craneCost + civilCost +
        accommodationCost + erectionCost + freightCost + otherCosts;

    // Discount
    let discountAmount = data.discountAmount ?? 0;
    if (pc.discountType === 'percentage' && pc.discountValue && subtotal > 0) {
      discountAmount = subtotal * (pc.discountValue / 100);
    } else if (pc.discountType === 'fixed') {
      discountAmount = pc.discountValue ?? 0;
    }

    const afterDiscount = subtotal - discountAmount;
    const gstRate = data.gstRate ?? pc.gstRate ?? 18;
    const taxAmount = data.taxAmount ?? (afterDiscount * gstRate) / 100;

    const grandTotal = data.grandTotal ?? afterDiscount + taxAmount;
    const amountInWords = data.amountInWords || this.numberToWords(grandTotal);

    return {
      materialCost,
      labourCost,
      installationCost,
      transportationCost,
      craneCost,
      civilCost,
      accommodationCost,
      erectionCost,
      freightCost,
      otherCosts,
      subtotal,
      discountAmount,
      discountPercentage: data.discountPercentage,
      taxAmount,
      grandTotal,
      amountInWords,
    };
  }

  private numberToWords(num: number): string {
    if (!num || num === 0) return 'Zero';

    const ones = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen',
    ];
    const tens = [
      '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
    ];

    const convertBelow1000 = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return (
        ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertBelow1000(n % 100) : '')
      );
    };

    const convert = (n: number): string => {
      if (n === 0) return '';
      if (n < 1000) return convertBelow1000(n);
      if (n < 100000)
        return convertBelow1000(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
      if (n < 10000000)
        return convertBelow1000(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
      return (
        convertBelow1000(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
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
