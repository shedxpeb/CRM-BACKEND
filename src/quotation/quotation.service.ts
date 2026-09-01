import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { Prisma } from '@prisma/client';

interface MaterialRate {
  amount?: number;
  [key: string]: unknown;
}

interface PricingConfiguration {
  materialRates?: MaterialRate[];
  labourCost?: number;
  installationCost?: number;
  transportationCost?: number;
  craneCost?: number;
  civilCost?: number;
  accommodationCost?: number;
  erectionCost?: number;
  freightCost?: number;
  discountType?: string;
  discountValue?: number;
  gstRate?: number;
  gstType?: string;
  [key: string]: unknown;
}

@Injectable()
export class QuotationService {
  private readonly logger = new Logger(QuotationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateQuotationNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const sequence = await this.prisma.$queryRaw<{ sequence: number }[]>`
      INSERT INTO "NumberSequence" ("id", "organizationId", "entityType", "prefix", "year", "sequence", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${organizationId}, 'QUOTATION', 'QUO', ${year}, 1, NOW(), NOW())
      ON CONFLICT ("entityType", "organizationId", "year") DO UPDATE SET "sequence" = "NumberSequence"."sequence" + 1, "updatedAt" = NOW()
      RETURNING "sequence"
    `;
    return `QUO${String(sequence[0].sequence).padStart(6, '0')}`;
  }

  async findAll(
    query: {
      page?: number;
      pageSize?: number;
      status?: string;
      customerId?: string;
      search?: string;
    },
    organizationId: string,
  ) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      organizationId,
      isDeleted: false,
    };

    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.search) {
      where.OR = [
        { quotationNumber: { contains: query.search, mode: 'insensitive' } },
        { customerName: { contains: query.search, mode: 'insensitive' } },
        { projectName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return {
      data,
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
    if (!quotation) throw new NotFoundException('Quotation not found');
    return quotation;
  }

  async create(
    dto: CreateQuotationDto,
    organizationId: string,
    createdById: string,
    createdBy: string,
  ) {
    const quotationNumber = await this.generateQuotationNumber(organizationId);

    // Calculate pricing from materialSelections in pricingConfiguration
    const pricingConfig = dto.pricingConfiguration as PricingConfiguration;
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;
    let grandTotal = 0;

    if (pricingConfig) {
      const materialRates = pricingConfig.materialRates || [];
      subtotal = materialRates.reduce(
        (sum: number, r: { amount?: number }) => sum + (r.amount || 0),
        0,
      );
      subtotal +=
        (pricingConfig.labourCost || 0) +
        (pricingConfig.installationCost || 0) +
        (pricingConfig.transportationCost || 0) +
        (pricingConfig.craneCost || 0) +
        (pricingConfig.civilCost || 0) +
        (pricingConfig.accommodationCost || 0) +
        (pricingConfig.erectionCost || 0) +
        (pricingConfig.freightCost || 0);

      const discountType = pricingConfig.discountType || 'none';
      const discountValue = pricingConfig.discountValue || 0;
      discountAmount =
        discountType === 'percentage'
          ? (subtotal * discountValue) / 100
          : discountType === 'fixed'
            ? discountValue
            : 0;

      const afterDiscount = subtotal - discountAmount;
      const gstRate = pricingConfig.gstRate || 0;
      taxAmount = (afterDiscount * gstRate) / 100;
      grandTotal = afterDiscount + taxAmount;
    }

    // Build materialSelections JSON from pricingConfiguration
    const materialSelections =
      pricingConfig?.materialRates?.map(
        (r: { materialSelectionId: string; rate: number; quantity: number; amount: number }) => ({
          id: r.materialSelectionId,
          itemMasterId: r.materialSelectionId,
          rate: r.rate,
          quantity: r.quantity,
          amount: r.amount,
        }),
      ) || [];

    const quotation = await this.prisma.quotation.create({
      data: {
        organizationId,
        quotationNumber,
        proposalId: dto.proposalId || undefined,
        customerId: dto.customerId || undefined,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail || undefined,
        customerPhone: dto.customerPhone || undefined,
        customerAddress: dto.customerAddress || undefined,
        customerGST: dto.customerGST || undefined,
        projectId: dto.projectId || undefined,
        projectName: dto.projectName || undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        paymentTerms: dto.paymentTerms || undefined,
        deliveryTerms: dto.deliveryTerms || undefined,
        pricingConfiguration: pricingConfig || undefined,
        materialSelections,
        termsAndConditions: dto.termsAndConditions || undefined,
        notes: dto.notes || undefined,
        internalNotes: dto.internalNotes || undefined,
        templateId: dto.templateId || undefined,
        subtotal,
        discountAmount,
        taxAmount,
        grandTotal,
        createdById,
        createdBy,
        gstType: pricingConfig?.gstType || 'CGST',
      },
    });

    return quotation;
  }

  async update(
    id: string,
    dto: UpdateQuotationDto,
    organizationId: string,
    updatedById: string,
    updatedBy: string,
  ) {
    const existing = await this.findById(id, organizationId);

    // Recalculate pricing if configuration changed
    const pricingConfig =
      (dto.pricingConfiguration as PricingConfiguration) ||
      (existing.pricingConfiguration as PricingConfiguration);
    let subtotal = existing.subtotal;
    let discountAmount = existing.discountAmount;
    let taxAmount = existing.taxAmount;
    let grandTotal = existing.grandTotal;
    let materialSelections = (existing.materialSelections as unknown[]) || [];

    if (pricingConfig) {
      const materialRates = pricingConfig.materialRates || [];
      subtotal = materialRates.reduce(
        (sum: number, r: { amount?: number }) => sum + (r.amount || 0),
        0,
      );
      subtotal +=
        (pricingConfig.labourCost || 0) +
        (pricingConfig.installationCost || 0) +
        (pricingConfig.transportationCost || 0) +
        (pricingConfig.craneCost || 0) +
        (pricingConfig.civilCost || 0) +
        (pricingConfig.accommodationCost || 0) +
        (pricingConfig.erectionCost || 0) +
        (pricingConfig.freightCost || 0);

      const discountType = pricingConfig.discountType || 'none';
      const discountValue = pricingConfig.discountValue || 0;
      discountAmount =
        discountType === 'percentage'
          ? (subtotal * discountValue) / 100
          : discountType === 'fixed'
            ? discountValue
            : 0;

      const afterDiscount = subtotal - discountAmount;
      const gstRate = pricingConfig.gstRate || 0;
      taxAmount = (afterDiscount * gstRate) / 100;
      grandTotal = afterDiscount + taxAmount;

      materialSelections = materialRates.map(
        (r: { materialSelectionId: string; rate: number; quantity: number; amount: number }) => ({
          id: r.materialSelectionId,
          itemMasterId: r.materialSelectionId,
          rate: r.rate,
          quantity: r.quantity,
          amount: r.amount,
        }),
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      updatedById,
      updatedBy,
      subtotal,
      discountAmount,
      taxAmount,
      grandTotal,
      materialSelections,
    };

    if (dto.customerId !== undefined) updateData.customerId = dto.customerId;
    if (dto.customerName !== undefined) updateData.customerName = dto.customerName;
    if (dto.customerEmail !== undefined) updateData.customerEmail = dto.customerEmail;
    if (dto.customerPhone !== undefined) updateData.customerPhone = dto.customerPhone;
    if (dto.customerAddress !== undefined) updateData.customerAddress = dto.customerAddress;
    if (dto.customerGST !== undefined) updateData.customerGST = dto.customerGST;
    if (dto.projectId !== undefined) updateData.projectId = dto.projectId;
    if (dto.projectName !== undefined) updateData.projectName = dto.projectName;
    if (dto.validUntil !== undefined)
      updateData.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (dto.paymentTerms !== undefined) updateData.paymentTerms = dto.paymentTerms;
    if (dto.deliveryTerms !== undefined) updateData.deliveryTerms = dto.deliveryTerms;
    if (dto.pricingConfiguration !== undefined)
      updateData.pricingConfiguration = dto.pricingConfiguration;
    if (dto.termsAndConditions !== undefined)
      updateData.termsAndConditions = dto.termsAndConditions;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.internalNotes !== undefined) updateData.internalNotes = dto.internalNotes;
    if (dto.templateId !== undefined) updateData.templateId = dto.templateId;

    return this.prisma.quotation.update({
      where: { id },
      data: updateData,
    });
  }

  async updateStatus(id: string, status: string, organizationId: string) {
    await this.findById(id, organizationId);
    return this.prisma.quotation.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string, organizationId: string, deletedById: string) {
    await this.findById(id, organizationId);
    return this.prisma.quotation.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), deletedById },
    });
  }

  async convertToProject(id: string, organizationId: string) {
    const quotation = await this.findById(id, organizationId);
    if (quotation.status !== 'Accepted') {
      throw new Error('Only accepted quotations can be converted to projects');
    }

    // Mark quotation as converted
    await this.prisma.quotation.update({
      where: { id },
      data: {
        status: 'Converted',
        convertedAt: new Date(),
      },
    });

    return { message: 'Quotation marked for project conversion', quotationId: id };
  }
}
