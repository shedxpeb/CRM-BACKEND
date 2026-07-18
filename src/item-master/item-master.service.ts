import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseQueryService } from '../common/services/base-query.service';
import { AuditService } from '../auth/services/audit.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { GetItemMastersDto } from './dto/get-item-masters.dto';
import { CreateItemMasterDto } from './dto/create-item-master.dto';
import { UpdateItemMasterDto } from './dto/update-item-master.dto';

@Injectable()
export class ItemMasterService extends BaseQueryService {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {
    super(prisma, {
      model: 'itemMaster',
      searchFields: [
        'itemName',
        'itemCode',
        'sku',
        'brand',
        'category',
        'specification',
        'hsnCode',
      ],
      filterFields: ['status', 'category', 'brand', 'itemTypeClass', 'unit', 'taxType'],
      sortColumns: [
        'createdAt',
        'itemName',
        'itemCode',
        'category',
        'brand',
        'status',
        'defaultRate',
      ],
      defaultSort: 'createdAt',
      orgScoped: true,
    });
  }

  async findAll(query: GetItemMastersDto, organizationId?: string) {
    return super.findAll(query, organizationId);
  }

  async findById(id: string, organizationId?: string) {
    return super.findById(
      id,
      {
        variants: true,
        inventoryItems: {
          where: { isDeleted: false },
          select: { id: true, itemName: true, currentStock: true, status: true },
        },
      },
      organizationId,
    );
  }

  async create(dto: CreateItemMasterDto, createdById: string, organizationId: string) {
    const lastItem = await this.client.findFirst({
      where: { organizationId, isDeleted: false },
      orderBy: { itemNumber: 'desc' },
      select: { itemNumber: true },
    });
    const nextNumber = (lastItem?.itemNumber || 0) + 1;
    const sku = dto.sku || `ITM-${String(nextNumber).padStart(4, '0')}`;
    const itemCode = dto.itemCode || sku;

    const item = await this.client.create({
      data: {
        organizationId,
        itemNumber: nextNumber,
        sku,
        itemCode,
        itemName: dto.itemName,
        category: dto.category,
        subCategory: dto.subCategory,
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId,
        itemTypeId: dto.itemTypeId,
        brand: dto.brand,
        grade: dto.grade,
        specification: dto.specification,
        hsnCode: dto.hsnCode,
        unit: dto.unit,
        weight: dto.weight,
        defaultRate: dto.defaultRate,
        gstRate: dto.gstRate,
        taxType: dto.taxType,
        technicalDescription: dto.technicalDescription,
        datasheetUrl: dto.datasheetUrl,
        productImageUrl: dto.productImageUrl,
        status: dto.status || 'Active',
        tags: dto.tags || [],
        manufacturer: dto.manufacturer,
        countryOfOrigin: dto.countryOfOrigin,
        description: dto.description,
        standardDimensions: dto.standardDimensions || undefined,
        currency: dto.currency || 'INR',
        images: dto.images || [],
        preferredSupplierId: dto.preferredSupplierId,
        preferredSupplier: dto.preferredSupplier,
        inventoryItemId: dto.inventoryItemId,
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        itemTypeClass: dto.itemTypeClass,
        materialGrade: dto.materialGrade,
        isStructural: dto.isStructural || false,
        isCladding: dto.isCladding || false,
        isAccessory: dto.isAccessory || false,
        isService: dto.isService || false,
        thickness: dto.thickness,
        length: dto.length,
        width: dto.width,
        customFields: dto.customFields || undefined,
        createdById,
        createdBy: createdById,
      },
    });

    await this.auditService.log({
      action: 'item-master.created',
      resource: 'ItemMaster',
      resourceId: item.id,
      organizationId,
      userId: createdById,
      metadata: { itemName: item.itemName, itemCode: item.itemCode },
    });

    await this.workflowEngine.processEvent({
      organizationId,
      entityType: 'item',
      entityId: item.id,
      eventType: 'created',
      data: { itemName: item.itemName, itemCode: item.itemCode },
      createdById,
    });

    return item;
  }

  async update(id: string, dto: UpdateItemMasterDto, updatedById: string, organizationId: string) {
    await this.findById(id, organizationId);

    const item = await this.client.update({
      where: { id },
      data: {
        ...(dto.itemName !== undefined && { itemName: dto.itemName }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.subCategory !== undefined && { subCategory: dto.subCategory }),
        ...(dto.brand !== undefined && { brand: dto.brand }),
        ...(dto.grade !== undefined && { grade: dto.grade }),
        ...(dto.specification !== undefined && { specification: dto.specification }),
        ...(dto.hsnCode !== undefined && { hsnCode: dto.hsnCode }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.defaultRate !== undefined && { defaultRate: dto.defaultRate }),
        ...(dto.gstRate !== undefined && { gstRate: dto.gstRate }),
        ...(dto.taxType !== undefined && { taxType: dto.taxType }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.technicalDescription !== undefined && {
          technicalDescription: dto.technicalDescription,
        }),
        ...(dto.itemTypeClass !== undefined && { itemTypeClass: dto.itemTypeClass }),
        ...(dto.materialGrade !== undefined && { materialGrade: dto.materialGrade }),
        ...(dto.isStructural !== undefined && { isStructural: dto.isStructural }),
        ...(dto.isCladding !== undefined && { isCladding: dto.isCladding }),
        ...(dto.isAccessory !== undefined && { isAccessory: dto.isAccessory }),
        ...(dto.isService !== undefined && { isService: dto.isService }),
        ...(dto.thickness !== undefined && { thickness: dto.thickness }),
        ...(dto.length !== undefined && { length: dto.length }),
        ...(dto.width !== undefined && { width: dto.width }),
        ...(dto.customFields !== undefined && { customFields: dto.customFields }),
        ...(dto.standardDimensions !== undefined && { standardDimensions: dto.standardDimensions }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        updatedBy: updatedById,
      },
    });

    await this.auditService.log({
      action: 'item-master.updated',
      resource: 'ItemMaster',
      resourceId: id,
      organizationId,
      userId: updatedById,
      metadata: { itemName: item.itemName },
    });

    await this.workflowEngine.processEvent({
      organizationId,
      entityType: 'item',
      entityId: id,
      eventType: 'updated',
      data: { itemName: item.itemName },
      createdById: updatedById,
    });

    return item;
  }

  async softDelete(id: string, deletedById: string, organizationId: string) {
    await this.findById(id, organizationId);

    const item = await this.client.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), deletedById },
    });

    await this.auditService.log({
      action: 'item-master.deleted',
      resource: 'ItemMaster',
      resourceId: id,
      organizationId,
      userId: deletedById,
      metadata: { itemName: item.itemName },
    });

    await this.workflowEngine.processEvent({
      organizationId,
      entityType: 'item',
      entityId: id,
      eventType: 'deleted',
      data: { itemName: item.itemName },
      createdById: deletedById,
    });

    return item;
  }

  async getStats(organizationId?: string) {
    const where = { organizationId, isDeleted: false };
    const [totalItems, activeItems, inactiveItems, discontinuedItems] = await Promise.all([
      this.client.count({ where }),
      this.client.count({ where: { ...where, status: 'Active' } }),
      this.client.count({ where: { ...where, status: 'Inactive' } }),
      this.client.count({ where: { ...where, status: 'Discontinued' } }),
    ]);

    const categoryAgg = await this.client.groupBy({
      by: ['category'],
      where,
      _count: { id: true },
    });
    const brandAgg = await this.client.groupBy({
      by: ['brand'],
      where: { ...where, brand: { not: null } },
      _count: { id: true },
    });
    const totalVariants = await this.client.itemVariant.count({ where: { organizationId } });
    const totalBundles = await this.client.itemBundle.count({
      where: { organizationId, isDeleted: false },
    });

    return {
      totalItems,
      activeItems,
      inactiveItems,
      discontinuedItems,
      itemsByCategory: Object.fromEntries(categoryAgg.map((c) => [c.category, c._count.id])),
      itemsByBrand: Object.fromEntries(brandAgg.map((b) => [b.brand || '', b._count.id])),
      totalVariants,
      totalBundles,
      recentlyAdded: activeItems,
      recentlyUpdated: activeItems,
    };
  }

  async getCombobox(query: any, organizationId?: string) {
    return super.getCombobox(query, organizationId, [
      'id',
      'itemName',
      'itemCode',
      'sku',
      'unit',
      'category',
      'brand',
      'defaultRate',
      'status',
    ]);
  }
}
