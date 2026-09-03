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
      rows: data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page < Math.ceil(total / pageSize),
        hasPrevious: page > 1,
      },
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
        pricingConfiguration: (pricingConfig as any) || undefined,
        // Store structured data in JSON columns with proper field mapping for PDF
        scopeConfiguration: dto.buildingSpec || {},
        technicalSpecifications: {
          // Building specification fields mapped to PDF expectations
          buildingLength: dto.buildingSpec?.length || '',
          buildingWidth: dto.buildingSpec?.width || '',
          buildingHeight: dto.buildingSpec?.clearHeight || '',
          buildingArea: dto.buildingSpec?.area || '',
          baySpacing: dto.buildingSpec?.sidewallBaySpacing || '',
          roofSlope: dto.buildingSpec?.roofSlope || '',
          // Additional building fields
          frameType: dto.buildingSpec?.frameType || '',
          endFrameCondition: dto.buildingSpec?.endFrameCondition || '',
          widthModule: dto.buildingSpec?.widthModule || '',
          opening: dto.buildingSpec?.opening || '',
          endwallBaySpacing: dto.buildingSpec?.endwallBaySpacing || '',
          brickwallCondition: dto.buildingSpec?.brickwallCondition || '',
          canopy: dto.buildingSpec?.canopy || '',
          roofSheeting: dto.buildingSpec?.roofSheeting || '',
          wallSheeting: dto.buildingSpec?.wallSheeting || '',
          gutter: dto.buildingSpec?.gutter || '',
          downTakePipe: dto.buildingSpec?.downTakePipe || '',
          bracingType: dto.buildingSpec?.bracingType || '',
          fascia: dto.buildingSpec?.fascia || '',
          futureExpansion: dto.buildingSpec?.futureExpansion || '',
          // Design code fields
          designCode: dto.designCode?.windLoadApplication || '',
          seismicCode: dto.designCode?.seismicCode || '',
          responseFactor: dto.designCode?.responseFactor || '',
          importanceFactor: dto.designCode?.importanceFactor || '',
          seismicZone: dto.designCode?.seismicZone || '',
          seismicCoefficient: dto.designCode?.seismicCoefficient || '',
          // Design load fields
          deadLoad: dto.designLoad?.deadLoad || '',
          liveLoad: dto.designLoad?.liveLoad || '',
          windLoad: dto.designLoad?.windSpeed || '',
          columnLoad: dto.designLoad?.columnLoad || '',
          collateralLoad: dto.designLoad?.collateralLoad || '',
          // Mezzanine fields
          mezzanineArea: dto.mezzanineLoad?.area || '',
          mezzanineLoad: dto.mezzanineLoad?.liveLoad || '',
          thicknessOfSlab: dto.mezzanineLoad?.thicknessOfSlab || '',
          mezzanineAdditionalLoad: dto.mezzanineLoad?.additionalLoad || '',
          stairCase: dto.mezzanineLoad?.stairCase || '',
          deflection: dto.mezzanineLoad?.deflection || '',
          topOfMezzanineSlab: dto.mezzanineLoad?.topOfMezzanineSlab || '',
          shearStud: dto.mezzanineLoad?.shearStud || '',
          // Crane fields
          craneCapacity: dto.craneDetail?.capacity || '',
          numberOfCranes: dto.craneDetail?.numberOfCranes || '',
          craneSpan: dto.craneDetail?.span || '',
          trolleyHoistWeight: dto.craneDetail?.trolleyHoistWeight || '',
          craneWeight: dto.craneDetail?.craneWeight || '',
          wheelLoad: dto.craneDetail?.wheelLoad || '',
          wheelBase: dto.craneDetail?.wheelBase || '',
          runLength: dto.craneDetail?.runLength || '',
          topOfCraneBeam: dto.craneDetail?.topOfCraneBeam || '',
          // Accessories as structured arrays
          roofAccessories: dto.roofAccessories || [],
          wallAccessories: dto.wallAccessories || [],
          // Materials and weight
          materialSpecs: dto.materialSpecs || [],
          weightRows: dto.weightRows || [],
        },
        // Store line items in materialSelections for PDF
        materialSelections: (dto.lineItems || []).map((item: any) => ({
          id: item.id || item.itemMasterId,
          itemMasterId: item.itemMasterId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
        })),
        proposalConfiguration: {
          materialSpecs: dto.materialSpecs || [],
          weightRows: dto.weightRows || [],
          lineItems: dto.lineItems || [],
        },
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
        // Add inquiry number and date
        inquiryNumber: dto.inquiryNumber || undefined,
        date: dto.date ? new Date(dto.date) : undefined,
        // Add Page 2 fields
        preparedByCompany: dto.preparedByCompany || undefined,
        preparedByAddress: dto.preparedByAddress || undefined,
        preparedByGstin: dto.preparedByGstin || undefined,
        preparedByName: dto.preparedByName || undefined,
        preparedByDesignation: dto.preparedByDesignation || undefined,
        preparedByMobile: dto.preparedByMobile || undefined,
        preparedByEmail: dto.preparedByEmail || undefined,
        subject: dto.subject || undefined,
        introduction: dto.introduction || undefined,
        signaturePrefix: dto.signaturePrefix || undefined,
        signatureName: dto.signatureName || undefined,
        signatureDesignation: dto.signatureDesignation || undefined,
        signatureMobile: dto.signatureMobile || undefined,
        signatureEmail: dto.signatureEmail || undefined,
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
    if (dto.inquiryNumber !== undefined) updateData.inquiryNumber = dto.inquiryNumber;
    if (dto.date !== undefined) updateData.date = dto.date ? new Date(dto.date) : null;
    // Add Page 2 fields
    if (dto.preparedByCompany !== undefined) updateData.preparedByCompany = dto.preparedByCompany;
    if (dto.preparedByAddress !== undefined) updateData.preparedByAddress = dto.preparedByAddress;
    if (dto.preparedByGstin !== undefined) updateData.preparedByGstin = dto.preparedByGstin;
    if (dto.preparedByName !== undefined) updateData.preparedByName = dto.preparedByName;
    if (dto.preparedByDesignation !== undefined) updateData.preparedByDesignation = dto.preparedByDesignation;
    if (dto.preparedByMobile !== undefined) updateData.preparedByMobile = dto.preparedByMobile;
    if (dto.preparedByEmail !== undefined) updateData.preparedByEmail = dto.preparedByEmail;
    if (dto.subject !== undefined) updateData.subject = dto.subject;
    if (dto.introduction !== undefined) updateData.introduction = dto.introduction;
    if (dto.signaturePrefix !== undefined) updateData.signaturePrefix = dto.signaturePrefix;
    if (dto.signatureName !== undefined) updateData.signatureName = dto.signatureName;
    if (dto.signatureDesignation !== undefined) updateData.signatureDesignation = dto.signatureDesignation;
    if (dto.signatureMobile !== undefined) updateData.signatureMobile = dto.signatureMobile;
    if (dto.signatureEmail !== undefined) updateData.signatureEmail = dto.signatureEmail;
    // Handle new structured fields
    if (dto.buildingSpec !== undefined) updateData.scopeConfiguration = dto.buildingSpec;
    if (dto.designCode !== undefined || dto.designLoad !== undefined || dto.mezzanineLoad !== undefined || dto.craneDetail !== undefined) {
      updateData.technicalSpecifications = {
        designCode: dto.designCode || (existing.technicalSpecifications as any)?.designCode || {},
        designLoad: dto.designLoad || (existing.technicalSpecifications as any)?.designLoad || {},
        mezzanineLoad: dto.mezzanineLoad !== undefined ? dto.mezzanineLoad : (existing.technicalSpecifications as any)?.mezzanineLoad,
        craneDetail: dto.craneDetail !== undefined ? dto.craneDetail : (existing.technicalSpecifications as any)?.craneDetail,
      };
    }
    if (dto.roofAccessories !== undefined) updateData.inclusions = dto.roofAccessories;
    if (dto.wallAccessories !== undefined) updateData.exclusions = dto.wallAccessories;
    if (dto.materialSpecs !== undefined || dto.weightRows !== undefined) {
      updateData.proposalConfiguration = {
        materialSpecs: dto.materialSpecs || (existing.proposalConfiguration as any)?.materialSpecs || [],
        weightRows: dto.weightRows || (existing.proposalConfiguration as any)?.weightRows || [],
      };
    }

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
