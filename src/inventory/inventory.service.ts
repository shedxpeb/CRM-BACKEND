import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseQueryService } from '../common/services/base-query.service';
import { AuditService } from '../auth/services/audit.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { GetInventoryDto } from './dto/get-inventory.dto';
import { CreateInventoryItemDto } from './dto/create-inventory.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryService extends BaseQueryService {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {
    super(prisma, {
      model: 'inventoryItem',
      searchFields: ['itemName', 'itemCode', 'category', 'brand', 'warehouseName'],
      filterFields: ['status', 'category', 'brand', 'itemTypeClass', 'warehouseId'],
      sortColumns: ['createdAt', 'itemName', 'itemCode', 'currentStock', 'totalValue', 'status'],
      defaultSort: 'createdAt',
      orgScoped: true,
    });
  }

  private deriveStatus(current: number, minimum: number, reorder: number): string {
    if (current <= 0) return 'Out of Stock';
    if (current <= minimum * 0.5) return 'Critical';
    if (current <= minimum || current <= reorder) return 'Low Stock';
    return 'In Stock';
  }

  async findAll(query: GetInventoryDto, organizationId?: string) {
    const where: any = { isDeleted: false };
    if (organizationId) where.organizationId = organizationId;

    if (query.lowStock === 'true') {
      where.status = { in: ['Low Stock', 'Critical', 'Out of Stock'] };
    }

    const result = await super.findAll({ ...query, ...(query.lowStock ? { status: undefined } : {}) }, organizationId);

    return result;
  }

  async findById(id: string, organizationId?: string) {
    return super.findById(id, {
      warehouse: true,
      supplier: true,
      movements: { orderBy: { createdAt: 'desc' }, take: 50 },
    }, organizationId);
  }

  async create(dto: CreateInventoryItemDto, createdById: string, organizationId: string) {
    const lastItem = await this.client.findFirst({
      where: { organizationId, isDeleted: false },
      orderBy: { itemNumber: 'desc' },
      select: { itemNumber: true },
    });
    const nextNumber = (lastItem?.itemNumber || 0) + 1;
    const itemCode = dto.itemCode || `INV-${String(nextNumber).padStart(4, '0')}`;

    const currentStock = dto.currentStock || 0;
    const purchaseRate = dto.purchaseRate || 0;

    const warehouse = dto.warehouseId
      ? await this.prisma.warehouse.findFirst({ where: { id: dto.warehouseId, organizationId } })
      : null;

    const item = await this.client.create({
      data: {
        organizationId,
        itemNumber: nextNumber,
        itemCode,
        itemMasterId: dto.itemMasterId || null,
        itemName: dto.itemName,
        unit: dto.unit,
        currentStock,
        reservedStock: 0,
        issuedStock: 0,
        minimumStock: dto.minimumStock || 0,
        reorderLevel: dto.reorderLevel || 0,
        safetyStock: dto.safetyStock || 0,
        purchaseRate,
        totalValue: currentStock * purchaseRate,
        warehouseId: dto.warehouseId || null,
        warehouseName: warehouse?.name || null,
        binLocation: dto.binLocation,
        supplierId: dto.supplierId || null,
        reorderQuantity: dto.reorderQuantity,
        category: dto.category,
        brand: dto.brand,
        itemTypeClass: dto.itemTypeClass,
        status: this.deriveStatus(currentStock, dto.minimumStock || 0, dto.reorderLevel || 0),
        tags: dto.tags || [],
        customFields: dto.customFields || undefined,
      },
    });

    await this.auditService.log({
      action: 'inventory.created',
      resource: 'InventoryItem',
      resourceId: item.id,
      organizationId,
      userId: createdById,
      metadata: { itemName: item.itemName, itemCode: item.itemCode },
    });

    await this.workflowEngine.processEvent({
      organizationId,
      entityType: 'inventory',
      entityId: item.id,
      eventType: 'created',
      data: { itemName: item.itemName, itemCode: item.itemCode },
      createdById,
    });

    return item;
  }

  async update(id: string, dto: UpdateInventoryItemDto, updatedById: string, organizationId: string) {
    await this.findById(id, organizationId);

    const existing = await this.client.findFirst({ where: { id } });
    const currentStock = dto.currentStock ?? existing.currentStock;
    const purchaseRate = dto.purchaseRate ?? existing.purchaseRate;

    const item = await this.client.update({
      where: { id },
      data: {
        ...(dto.itemName !== undefined && { itemName: dto.itemName }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.currentStock !== undefined && { currentStock: dto.currentStock }),
        ...(dto.minimumStock !== undefined && { minimumStock: dto.minimumStock }),
        ...(dto.reorderLevel !== undefined && { reorderLevel: dto.reorderLevel }),
        ...(dto.safetyStock !== undefined && { safetyStock: dto.safetyStock }),
        ...(dto.purchaseRate !== undefined && { purchaseRate: dto.purchaseRate }),
        ...(dto.warehouseId !== undefined && { warehouseId: dto.warehouseId }),
        ...(dto.binLocation !== undefined && { binLocation: dto.binLocation }),
        ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.brand !== undefined && { brand: dto.brand }),
        ...(dto.itemTypeClass !== undefined && { itemTypeClass: dto.itemTypeClass }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.reorderQuantity !== undefined && { reorderQuantity: dto.reorderQuantity }),
        ...(dto.customFields !== undefined && { customFields: dto.customFields }),
        totalValue: currentStock * purchaseRate,
        lastUpdated: new Date(),
        status: this.deriveStatus(currentStock, existing.minimumStock, existing.reorderLevel),
      },
    });

    await this.auditService.log({
      action: 'inventory.updated',
      resource: 'InventoryItem',
      resourceId: id,
      organizationId,
      userId: updatedById,
      metadata: { itemName: item.itemName },
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
      action: 'inventory.deleted',
      resource: 'InventoryItem',
      resourceId: id,
      organizationId,
      userId: deletedById,
      metadata: { itemName: item.itemName },
    });

    await this.workflowEngine.processEvent({
      organizationId,
      entityType: 'inventory',
      entityId: id,
      eventType: 'deleted',
      data: { itemName: item.itemName },
      createdById: deletedById,
    });

    return item;
  }

  async getStats(organizationId?: string) {
    const where = { organizationId, isDeleted: false };
    const items = await this.client.findMany({ where, select: { currentStock: true, totalValue: true, status: true, reservedStock: true, incomingStock: true, outgoingStock: true } });

    const totalItems = items.length;
    const totalValue = items.reduce((sum, i) => sum + (i.totalValue || 0), 0);
    const lowStockItems = items.filter(i => i.status === 'Low Stock' || i.status === 'Critical').length;
    const outOfStockItems = items.filter(i => i.status === 'Out of Stock').length;
    const incomingStock = items.reduce((sum, i) => sum + (i.incomingStock || 0), 0);
    const outgoingStock = items.reduce((sum, i) => sum + (i.outgoingStock || 0), 0);
    const reservedStock = items.reduce((sum, i) => sum + (i.reservedStock || 0), 0);

    const activeSuppliers = await this.prisma.supplier.count({ where: { organizationId, isDeleted: false, status: 'Active' } });
    const materialShortages = items.filter(i => i.status === 'Critical' || i.status === 'Out of Stock').length;

    return {
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems,
      incomingStock,
      outgoingStock,
      reservedStock,
      activeSuppliers,
      pendingPurchaseRequests: 0,
      materialShortages,
    };
  }

  // ─── WAREHOUSES ──────────────────────────────────────

  async getWarehouses(organizationId: string) {
    return this.prisma.warehouse.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWarehouse(dto: any, organizationId: string) {
    const lastWh = await this.prisma.warehouse.findFirst({
      where: { organizationId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: { warehouseCode: true },
    });
    const code = dto.warehouseCode || `WH-${String((lastWh ? 0 : 0) + 1).padStart(3, '0')}`;

    return this.prisma.warehouse.create({
      data: {
        organizationId,
        warehouseCode: code,
        name: dto.name,
        location: dto.location,
        address: dto.address,
        manager: dto.manager,
        contactNumber: dto.contactNumber,
        capacity: dto.capacity,
        notes: dto.notes,
      },
    });
  }

  async updateWarehouse(id: string, dto: any, organizationId: string) {
    return this.prisma.warehouse.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.manager !== undefined && { manager: dto.manager }),
        ...(dto.contactNumber !== undefined && { contactNumber: dto.contactNumber }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async deleteWarehouse(id: string, organizationId: string) {
    return this.prisma.warehouse.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // ─── SUPPLIERS ──────────────────────────────────────

  async getSuppliers(organizationId: string) {
    return this.prisma.supplier.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSupplier(dto: any, organizationId: string) {
    return this.prisma.supplier.create({
      data: {
        organizationId,
        name: dto.name,
        gstNumber: dto.gstNumber,
        contactPerson: dto.contactPerson,
        mobile: dto.mobile,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        gstRegistered: dto.gstRegistered || false,
        rating: dto.rating,
        notes: dto.notes,
      },
    });
  }

  async updateSupplier(id: string, dto: any, organizationId: string) {
    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.gstNumber !== undefined && { gstNumber: dto.gstNumber }),
        ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson }),
        ...(dto.mobile !== undefined && { mobile: dto.mobile }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async deleteSupplier(id: string, organizationId: string) {
    return this.prisma.supplier.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // ─── CATEGORIES ──────────────────────────────────────

  async getCategories(organizationId: string) {
    return this.prisma.inventoryCategory.findMany({
      where: { organizationId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(dto: any, organizationId: string) {
    return this.prisma.inventoryCategory.create({
      data: {
        organizationId,
        name: dto.name,
        parentId: dto.parentId,
        description: dto.description,
      },
    });
  }

  // ─── STOCK MOVEMENTS ─────────────────────────────────

  async getMovements(organizationId: string, query?: any) {
    const page = query?.page || 1;
    const pageSize = Math.min(query?.pageSize || 25, 100);
    const where: any = { organizationId };
    if (query?.inventoryItemId) where.inventoryItemId = query.inventoryItemId;
    if (query?.type) where.type = query.type;

    const [rows, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data: rows,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrevious: page > 1,
      },
    };
  }

  async createMovement(dto: any, organizationId: string, performedById: string) {
    const movementCount = await this.prisma.stockMovement.count({ where: { organizationId } });
    const movementNumber = `MOV-${String(movementCount + 1).padStart(6, '0')}`;

    const movement = await this.prisma.stockMovement.create({
      data: {
        organizationId,
        movementNumber,
        inventoryItemId: dto.itemId,
        itemName: dto.itemName,
        type: dto.type,
        quantity: dto.quantity,
        warehouseId: dto.warehouseId,
        warehouseName: dto.warehouse,
        referenceNumber: dto.referenceNumber,
        referenceType: dto.referenceType,
        remarks: dto.remarks,
        performedBy: dto.performedBy || performedById,
      },
    });

    const stockDelta = dto.type === 'Stock In' || dto.type === 'stockIn'
      ? dto.quantity
      : dto.type === 'Stock Out' || dto.type === 'stockOut'
        ? -dto.quantity
        : 0;

    if (stockDelta !== 0) {
      const item = await this.client.findFirst({ where: { id: dto.itemId } });
      if (item) {
        const newStock = Math.max(0, item.currentStock + stockDelta);
        await this.client.update({
          where: { id: dto.itemId },
          data: {
            currentStock: newStock,
            totalValue: newStock * (item.purchaseRate || 0),
            lastUpdated: new Date(),
            status: this.deriveStatus(newStock, item.minimumStock, item.reorderLevel),
          },
        });
      }
    }

    await this.auditService.log({
      action: `inventory.movement.${dto.type.toLowerCase().replace(/\s+/g, '-')}`,
      resource: 'StockMovement',
      resourceId: movement.id,
      organizationId,
      userId: performedById,
      metadata: { itemName: dto.itemName, quantity: dto.quantity, type: dto.type },
    });

    return movement;
  }

  async getMovementHistory(itemId: string, organizationId: string) {
    return this.prisma.stockMovement.findMany({
      where: { inventoryItemId: itemId, organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ─── ALERTS ──────────────────────────────────────────

  async getAlerts(organizationId: string) {
    const items = await this.client.findMany({
      where: {
        organizationId,
        isDeleted: false,
        status: { in: ['Low Stock', 'Critical', 'Out of Stock'] },
      },
    });

    return items.map(item => ({
      id: `alert_${item.id}`,
      itemId: item.id,
      itemName: item.itemName,
      itemCode: item.itemCode,
      type: item.status === 'Out of Stock' ? 'Out of Stock' : item.status === 'Critical' ? 'Critical Stock' : 'Low Stock',
      currentStock: item.currentStock,
      threshold: item.minimumStock,
      severity: item.status === 'Out of Stock' || item.status === 'Critical' ? 'critical' : 'warning',
      createdAt: item.createdAt,
    }));
  }
}
