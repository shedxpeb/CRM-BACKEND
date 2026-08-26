import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseQueryService, serializeDecimals } from '../common/services/base-query.service';
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
      model: 'inventoryItem',
      searchFields: [
        'itemName',
        'itemCode',
        'brand',
        'category',
        'description',
      ],
      filterFields: ['status', 'category', 'brand', 'itemTypeClass', 'unit'],
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
      {},
      organizationId,
    );
  }

  async create(dto: CreateItemMasterDto, createdById: string, organizationId: string) {
    // Count existing items to generate sequence number
    const count = await this.client.inventoryItem.count({
      where: { organizationId, isDeleted: false },
    });
    const nextNumber = count + 1;

    // Generate unique SKU - check for conflicts
    let sku = dto.sku || `ITM-${String(nextNumber).padStart(4, '0')}`;

    // If user provided SKU, check if it already exists
    if (dto.sku) {
      const existingSku = await this.client.inventoryItem.findFirst({
        where: { organizationId, itemCode: dto.sku, isDeleted: false },
        select: { itemCode: true },
      });
      if (existingSku) {
        throw new Error(`SKU "${dto.sku}" already exists in this organization`);
      }
    } else {
      // Auto-generate unique SKU with conflict resolution
      let skuExists = true;
      let attemptNumber = nextNumber;
      const maxAttempts = 100; // Prevent infinite loop
      let attempts = 0;

      while (skuExists && attempts < maxAttempts) {
        const existingSku = await this.client.inventoryItem.findFirst({
          where: { organizationId, itemCode: sku, isDeleted: false },
          select: { itemCode: true },
        });
        if (!existingSku) {
          skuExists = false;
        } else {
          attemptNumber++;
          sku = `ITM-${String(attemptNumber).padStart(4, '0')}`;
        }
        attempts++;
      }

      if (skuExists) {
        throw new Error('Unable to generate unique SKU after multiple attempts');
      }
    }

    const itemCode = dto.itemCode || sku;

    const item = await this.client.inventoryItem.create({
      data: {
        organizationId,
        itemCode,
        itemName: dto.itemName,
        category: dto.category,
        brand: dto.brand,
        unit: dto.unit,
        defaultRate: dto.defaultRate || 0,
        status: dto.status || 'In Stock',
        description: dto.description,
        itemNumber: nextNumber,
        itemTypeClass: dto.itemTypeClass,
        createdById,
      },
    });

    // Post-processing: audit log (optional - don't fail if this errors)
    try {
      await this.auditService.log({
        action: 'item-master.created',
        resource: 'ItemMaster',
        resourceId: item.id,
        organizationId,
        userId: createdById,
        metadata: { itemName: item.itemName, itemCode: item.itemCode },
      });
    } catch (error) {
      this.logger.error(`Failed to log audit for item creation: ${error.message}`);
    }

    // Post-processing: workflow event (optional - don't fail if this errors)
    try {
      await this.workflowEngine.processEvent({
        organizationId,
        entityType: 'item',
        entityId: item.id,
        eventType: 'created',
        data: { itemName: item.itemName, itemCode: item.itemCode },
        createdById,
      });
    } catch (error) {
      this.logger.error(`Failed to process workflow event for item creation: ${error.message}`);
    }

    return serializeDecimals(item);
  }

  async update(id: string, dto: UpdateItemMasterDto, updatedById: string, organizationId: string) {
    await this.findById(id, organizationId);

    const item = await this.client.inventoryItem.update({
      where: { id },
      data: {
        ...(dto.itemName !== undefined && { itemName: dto.itemName }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.brand !== undefined && { brand: dto.brand }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.defaultRate !== undefined && { defaultRate: dto.defaultRate }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.itemTypeClass !== undefined && { itemTypeClass: dto.itemTypeClass }),
        updatedBy: updatedById,
      },
    });

    // Post-processing: audit log (optional - don't fail if this errors)
    try {
      await this.auditService.log({
        action: 'item-master.updated',
        resource: 'ItemMaster',
        resourceId: id,
        organizationId,
        userId: updatedById,
        metadata: { itemName: item.itemName },
      });
    } catch (error) {
      this.logger.error(`Failed to log audit for item update: ${error.message}`);
    }

    // Post-processing: workflow event (optional - don't fail if this errors)
    try {
      await this.workflowEngine.processEvent({
        organizationId,
        entityType: 'item',
        entityId: id,
        eventType: 'updated',
        data: { itemName: item.itemName },
        createdById: updatedById,
      });
    } catch (error) {
      this.logger.error(`Failed to process workflow event for item update: ${error.message}`);
    }

    return serializeDecimals(item);
  }

  async softDelete(id: string, deletedById: string, organizationId: string) {
    await this.findById(id, organizationId);

    const item = await this.client.inventoryItem.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), deletedById },
    });

    // Post-processing: audit log (optional - don't fail if this errors)
    try {
      await this.auditService.log({
        action: 'item-master.deleted',
        resource: 'ItemMaster',
        resourceId: id,
        organizationId,
        userId: deletedById,
        metadata: { itemName: item.itemName },
      });
    } catch (error) {
      this.logger.error(`Failed to log audit for item deletion: ${error.message}`);
    }

    // Post-processing: workflow event (optional - don't fail if this errors)
    try {
      await this.workflowEngine.processEvent({
        organizationId,
        entityType: 'item',
        entityId: id,
        eventType: 'deleted',
        data: { itemName: item.itemName },
        createdById: deletedById,
      });
    } catch (error) {
      this.logger.error(`Failed to process workflow event for item deletion: ${error.message}`);
    }

    return item;
  }

  async getStats(organizationId?: string) {
    const where = { organizationId, isDeleted: false };
    const [totalItems, activeItems, inactiveItems, discontinuedItems] = await Promise.all([
      this.client.inventoryItem.count({ where }),
      this.client.inventoryItem.count({ where: { ...where, status: 'In Stock' } }),
      this.client.inventoryItem.count({ where: { ...where, status: 'Out of Stock' } }),
      this.client.inventoryItem.count({ where: { ...where, status: 'Discontinued' } }),
    ]);

    const categoryAgg = await this.client.inventoryItem.groupBy({
      by: ['category'],
      where,
      _count: { id: true },
    });
    const brandAgg = await this.client.inventoryItem.groupBy({
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
      itemsByCategory: Object.fromEntries(categoryAgg.map((c) => [c.category || 'Uncategorized', c._count.id])),
      itemsByBrand: Object.fromEntries(brandAgg.map((b) => [b.brand || '', b._count.id])),
      totalVariants,
      totalBundles,
      recentlyAdded: activeItems,
      recentlyUpdated: activeItems,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
