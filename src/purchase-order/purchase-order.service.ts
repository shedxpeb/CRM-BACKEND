import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../auth/services/audit.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { BaseQueryService, serializeDecimals } from '../common/services/base-query.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { GetPurchaseOrdersDto } from './dto/get-purchase-orders.dto';
import { calculatePoFinancials, canTransitionStatus } from './purchase-order-calculator';

@Injectable()
export class PurchaseOrderService extends BaseQueryService {
  private readonly poLogger = new Logger(PurchaseOrderService.name);

  constructor(
    protected readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {
    super(prisma, {
      model: 'purchaseOrder',
      searchFields: ['poNumber', 'vendorName', 'projectName'],
      filterFields: ['status', 'vendorId', 'projectId'],
      sortColumns: ['createdAt', 'updatedAt', 'poNumber', 'grandTotal', 'status'],
      defaultSort: 'createdAt',
      orgScoped: true,
    });
  }

  async generatePONumber(organizationId: string): Promise<string> {
    const sequence = await this.prisma.$queryRaw<{ lastvalue: number }[]>`
      UPDATE "NumberSequence"
      SET "lastValue" = "lastValue" + 1, "updatedAt" = NOW()
      WHERE "organizationId" = ${organizationId} AND "entityName" = 'PO'
      RETURNING "lastValue"
    `;

    if (sequence.length === 0) {
      await this.prisma.$executeRaw`
        INSERT INTO "NumberSequence" ("id", "organizationId", "entityName", "prefix", "lastValue", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${organizationId}, 'PO', 'PO', 1, NOW(), NOW())
        ON CONFLICT ("organizationId", "entityName") DO UPDATE SET "lastValue" = "NumberSequence"."lastValue" + 1, "updatedAt" = NOW()
      `;
      const retry = await this.prisma.$queryRaw<{ lastvalue: number }[]>`
        SELECT "lastValue" as lastvalue FROM "NumberSequence"
        WHERE "organizationId" = ${organizationId} AND "entityName" = 'PO'
      `;
      return `PO${String(retry[0].lastvalue).padStart(6, '0')}`;
    }

    return `PO${String(sequence[0].lastvalue).padStart(6, '0')}`;
  }

  async createWithRetry(
    dto: CreatePurchaseOrderDto,
    createdById: string,
    createdBy: string,
    organizationId: string,
    retries = 3,
  ) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await this.create(dto, createdById, createdBy, organizationId);
      } catch (error: unknown) {
        if ((error as { code?: string }).code === 'P2002' && attempt < retries - 1) {
          this.poLogger.warn(`PO number collision on attempt ${attempt + 1}, retrying...`);
          continue;
        }
        throw error;
      }
    }
    throw new BadRequestException('Failed to generate unique PO number after multiple attempts');
  }

  async findAll(query: GetPurchaseOrdersDto, organizationId: string) {
    return super.findAll(query, organizationId, undefined, {
      items: true,
      vendor: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          email: true,
          phone: true,
        },
      },
    });
  }

  async findAllForExport(query: GetPurchaseOrdersDto, organizationId: string) {
    const result = await super.findAllForExport(query, organizationId);
    return { rows: result.rows, pagination: result.pagination };
  }

  async findById(id: string, organizationId: string) {
    return super.findById(
      id,
      {
        items: true,
        vendor: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
      organizationId,
    );
  }

  async create(
    dto: CreatePurchaseOrderDto,
    createdById: string,
    createdBy: string,
    organizationId: string,
  ) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: dto.vendorId, organizationId, isDeleted: false },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, organizationId, isDeleted: false },
      });
      if (!project) throw new NotFoundException('Project not found');
    }

    if (dto.warehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, organizationId, isDeleted: false },
      });
      if (!warehouse) throw new NotFoundException('Warehouse not found');
    }

    const poNumber = await this.generatePONumber(organizationId);
    const financials = calculatePoFinancials({
      items: dto.items,
      discount: dto.discount,
      discountType: dto.discountType,
      freight: dto.freight,
      packingCharges: dto.packingCharges,
      shippingCharges: dto.shippingCharges,
      otherCharges: dto.otherCharges,
    });

    const projectName = dto.projectId
      ? (await this.prisma.project.findUnique({ where: { id: dto.projectId } }))?.projectName
      : null;
    const warehouseName = dto.warehouseId
      ? (await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } }))?.name
      : null;

    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        poNumberInt: parseInt(poNumber.replace('PO', '')),
        vendorId: dto.vendorId,
        vendorName: vendor.companyName,
        projectId: dto.projectId,
        projectName,
        warehouseId: dto.warehouseId,
        warehouseName,
        paymentTerms: dto.paymentTerms,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: (dto.status as any) || 'Draft',
        currency: dto.currency || 'INR',
        subtotal: financials.subtotal,
        discount: dto.discount || 0,
        discountType: dto.discountType,
        tax: financials.totalTax,
        freight: dto.freight || 0,
        packingCharges: dto.packingCharges || 0,
        shippingCharges: dto.shippingCharges || 0,
        otherCharges: dto.otherCharges || 0,
        roundOff: financials.roundOff,
        grandTotal: financials.grandTotal,
        notes: dto.notes,
        terms: dto.terms,
        internalNotes: dto.internalNotes,
        customFields: dto.customFields,
        createdById,
        createdBy,
        organizationId,
        items: {
          create: dto.items.map((item, idx) => ({
            organizationId,
            itemMasterId: item.itemMasterId,
            itemCode: item.itemCode,
            itemName: item.itemName,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            gstRate: item.gstRate,
            gstAmount: financials.itemDetails[idx].gstAmount,
            discount: item.discount || 0,
            discountType: item.discountType,
            total: financials.itemDetails[idx].total,
            hsnCode: item.hsnCode,
            pendingQuantity: financials.itemDetails[idx].pendingQuantity,
          })),
        },
        timeline: {
          create: {
            organizationId,
            action: 'Created',
            performedById: createdById,
            performedBy: createdBy,
          },
        },
      },
      include: { items: true, timeline: true },
    });

    try {
      await this.auditService.log({
        action: 'purchase-order.created',
        resource: 'PurchaseOrder',
        resourceId: purchaseOrder.id,
        organizationId,
        userId: createdById,
        metadata: { poNumber: purchaseOrder.poNumber, grandTotal: purchaseOrder.grandTotal },
      });
    } catch (e) {
      this.poLogger.error(`Audit log failed: ${e.message}`);
    }

    try {
      await this.workflowEngine.processEvent({
        organizationId,
        entityType: 'purchase-order',
        entityId: purchaseOrder.id,
        eventType: 'created',
        data: { poNumber: purchaseOrder.poNumber, grandTotal: purchaseOrder.grandTotal },
        createdById,
      });
    } catch (e) {
      this.poLogger.error(`Workflow event failed: ${e.message}`);
    }

    return serializeDecimals(purchaseOrder);
  }

  async update(
    id: string,
    dto: UpdatePurchaseOrderDto,
    updatedById: string,
    updatedBy: string,
    organizationId: string,
  ) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId, isDeleted: false },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');

    if (
      po.status === 'Approved' ||
      po.status === 'Sent' ||
      po.status === 'FullyReceived' ||
      po.status === 'Closed'
    ) {
      throw new BadRequestException(
        'Cannot update approved, sent, received, or closed purchase orders',
      );
    }

    if (dto.vendorId && dto.vendorId !== po.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, organizationId, isDeleted: false },
      });
      if (!vendor) throw new NotFoundException('Vendor not found');
    }

    if (dto.status && dto.status !== po.status) {
      if (!canTransitionStatus(po.status, dto.status)) {
        throw new BadRequestException(
          `Cannot transition from "${po.status}" to "${dto.status}". Allowed: ${(canTransitionStatus as any)[po.status]?.join(', ') || 'none'}`,
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      ...(dto.vendorId !== undefined && { vendorId: dto.vendorId }),
      ...(dto.projectId !== undefined && { projectId: dto.projectId }),
      ...(dto.warehouseId !== undefined && { warehouseId: dto.warehouseId }),
      ...(dto.paymentTerms !== undefined && { paymentTerms: dto.paymentTerms }),
      ...(dto.expectedDeliveryDate !== undefined && {
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
      }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.discount !== undefined && { discount: dto.discount }),
      ...(dto.discountType !== undefined && { discountType: dto.discountType }),
      ...(dto.freight !== undefined && { freight: dto.freight }),
      ...(dto.packingCharges !== undefined && { packingCharges: dto.packingCharges }),
      ...(dto.shippingCharges !== undefined && { shippingCharges: dto.shippingCharges }),
      ...(dto.otherCharges !== undefined && { otherCharges: dto.otherCharges }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.terms !== undefined && { terms: dto.terms }),
      ...(dto.internalNotes !== undefined && { internalNotes: dto.internalNotes }),
      updatedBy,
    };

    if (dto.vendorId && dto.vendorId !== po.vendorId) {
      const vendor = await this.prisma.vendor.findUnique({ where: { id: dto.vendorId } });
      updateData.vendorName = vendor?.companyName || po.vendorName;
    }
    if (dto.projectId !== undefined) {
      updateData.projectName = dto.projectId
        ? (await this.prisma.project.findUnique({ where: { id: dto.projectId } }))?.projectName
        : null;
    }
    if (dto.warehouseId !== undefined) {
      updateData.warehouseName = dto.warehouseId
        ? (await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } }))?.name
        : null;
    }

    if (dto.items && dto.items.length > 0) {
      const financials = calculatePoFinancials({
        items: dto.items,
        discount: dto.discount ?? Number(po.discount),
        discountType: dto.discountType ?? po.discountType,
        freight: dto.freight ?? Number(po.freight),
        packingCharges: dto.packingCharges ?? Number(po.packingCharges),
        shippingCharges: dto.shippingCharges ?? Number(po.shippingCharges),
        otherCharges: dto.otherCharges ?? Number(po.otherCharges),
      });

      updateData.subtotal = financials.subtotal;
      updateData.tax = financials.totalTax;
      updateData.roundOff = financials.roundOff;
      updateData.grandTotal = financials.grandTotal;
      updateData.revision = { increment: 1 };

      const itemsToCreate = dto.items;

      const updatedPO = await this.prisma.$transaction(async (tx) => {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

        return tx.purchaseOrder.update({
          where: { id },
          data: {
            ...updateData,
            items: {
              create: itemsToCreate.map((item, idx) => ({
                organizationId,
                itemMasterId: item.itemMasterId,
                itemCode: item.itemCode,
                itemName: item.itemName,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                rate: item.rate,
                gstRate: item.gstRate,
                gstAmount: financials.itemDetails[idx].gstAmount,
                discount: item.discount || 0,
                discountType: item.discountType,
                total: financials.itemDetails[idx].total,
                hsnCode: item.hsnCode,
                pendingQuantity: financials.itemDetails[idx].pendingQuantity,
              })),
            },
            timeline: {
              create: {
                organizationId,
                action: 'Updated',
                performedById: updatedById,
                performedBy: updatedBy,
                metadata: { revision: (po.revision || 0) + 1 },
              },
            },
          },
          include: { items: true, timeline: true },
        });
      });

      try {
        await this.auditService.log({
          action: 'purchase-order.updated',
          resource: 'PurchaseOrder',
          resourceId: id,
          organizationId,
          userId: updatedById,
          metadata: { poNumber: po.poNumber, revision: updatedPO.revision },
        });
      } catch (e) {
        this.poLogger.error(`Audit log failed: ${e.message}`);
      }

      try {
        await this.workflowEngine.processEvent({
          organizationId,
          entityType: 'purchase-order',
          entityId: id,
          eventType: 'updated',
          data: { poNumber: po.poNumber, revision: updatedPO.revision },
          createdById: updatedById,
        });
      } catch (e) {
        this.poLogger.error(`Workflow event failed: ${e.message}`);
      }

      return serializeDecimals(updatedPO);
    }

    if (
      dto.discount !== undefined ||
      dto.discountType !== undefined ||
      dto.freight !== undefined ||
      dto.packingCharges !== undefined ||
      dto.shippingCharges !== undefined ||
      dto.otherCharges !== undefined
    ) {
      const existingItems = await this.prisma.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });
      const financials = calculatePoFinancials({
        items: existingItems.map((i) => ({
          quantity: Number(i.quantity),
          rate: Number(i.rate),
          discount: Number(i.discount),
          discountType: i.discountType || 'Amount',
          gstRate: i.gstRate ? Number(i.gstRate) : undefined,
        })),
        discount: dto.discount ?? Number(po.discount),
        discountType: dto.discountType ?? po.discountType,
        freight: dto.freight ?? Number(po.freight),
        packingCharges: dto.packingCharges ?? Number(po.packingCharges),
        shippingCharges: dto.shippingCharges ?? Number(po.shippingCharges),
        otherCharges: dto.otherCharges ?? Number(po.otherCharges),
      });
      updateData.subtotal = financials.subtotal;
      updateData.tax = financials.totalTax;
      updateData.roundOff = financials.roundOff;
      updateData.grandTotal = financials.grandTotal;
    }

    const updatedPO = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...updateData,
        timeline: {
          create: {
            organizationId,
            action: 'Updated',
            performedById: updatedById,
            performedBy: updatedBy,
          },
        },
      },
      include: { items: true, timeline: true },
    });

    try {
      await this.auditService.log({
        action: 'purchase-order.updated',
        resource: 'PurchaseOrder',
        resourceId: id,
        organizationId,
        userId: updatedById,
        metadata: { poNumber: po.poNumber },
      });
    } catch (e) {
      this.poLogger.error(`Audit log failed: ${e.message}`);
    }

    try {
      await this.workflowEngine.processEvent({
        organizationId,
        entityType: 'purchase-order',
        entityId: id,
        eventType: 'updated',
        data: { poNumber: po.poNumber },
        createdById: updatedById,
      });
    } catch (e) {
      this.poLogger.error(`Workflow event failed: ${e.message}`);
    }

    return serializeDecimals(updatedPO);
  }

  async approve(id: string, approvedById: string, approvedBy: string, organizationId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId, isDeleted: false },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');

    if (!canTransitionStatus(po.status, 'Approved')) {
      throw new BadRequestException(
        `Cannot approve a purchase order with status "${po.status}". Must be Draft or PendingApproval.`,
      );
    }

    const updatedPO = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'Approved',
        approvedById,
        approvedBy,
        approvedAt: new Date(),
        timeline: {
          create: {
            organizationId,
            action: 'Approved',
            performedById: approvedById,
            performedBy: approvedBy,
          },
        },
      },
      include: { items: true, timeline: true },
    });

    try {
      await this.auditService.log({
        action: 'purchase-order.approved',
        resource: 'PurchaseOrder',
        resourceId: id,
        organizationId,
        userId: approvedById,
        metadata: { poNumber: po.poNumber },
      });
    } catch (e) {
      this.poLogger.error(`Audit log failed: ${e.message}`);
    }

    try {
      await this.workflowEngine.processEvent({
        organizationId,
        entityType: 'purchase-order',
        entityId: id,
        eventType: 'approved',
        data: { poNumber: po.poNumber },
        createdById: approvedById,
      });
    } catch (e) {
      this.poLogger.error(`Workflow event failed: ${e.message}`);
    }

    return serializeDecimals(updatedPO);
  }

  async reject(
    id: string,
    rejectedById: string,
    rejectedBy: string,
    organizationId: string,
    reason?: string,
  ) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId, isDeleted: false },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');

    if (!canTransitionStatus(po.status, 'Rejected')) {
      throw new BadRequestException(`Cannot reject a purchase order with status "${po.status}".`);
    }

    const updatedPO = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'Rejected',
        rejectedById,
        rejectedBy,
        rejectedAt: new Date(),
        rejectReason: reason || null,
        timeline: {
          create: {
            organizationId,
            action: 'Rejected',
            performedById: rejectedById,
            performedBy: rejectedBy,
            metadata: reason ? { reason } : undefined,
          },
        },
      },
      include: { items: true, timeline: true },
    });

    try {
      await this.auditService.log({
        action: 'purchase-order.rejected',
        resource: 'PurchaseOrder',
        resourceId: id,
        organizationId,
        userId: rejectedById,
        metadata: { poNumber: po.poNumber, reason },
      });
    } catch (e) {
      this.poLogger.error(`Audit log failed: ${e.message}`);
    }

    try {
      await this.workflowEngine.processEvent({
        organizationId,
        entityType: 'purchase-order',
        entityId: id,
        eventType: 'rejected',
        data: { poNumber: po.poNumber, reason },
        createdById: rejectedById,
      });
    } catch (e) {
      this.poLogger.error(`Workflow event failed: ${e.message}`);
    }

    return serializeDecimals(updatedPO);
  }

  async markSent(id: string, userId: string, organizationId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId, isDeleted: false },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');

    if (!canTransitionStatus(po.status, 'Sent')) {
      throw new BadRequestException(
        `Cannot mark a purchase order with status "${po.status}" as sent.`,
      );
    }

    const updatedPO = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'Sent',
        sentToVendor: true,
        sentAt: new Date(),
        timeline: {
          create: {
            organizationId,
            action: 'Sent',
            performedById: userId,
          },
        },
      },
      include: { items: true, timeline: true },
    });

    try {
      await this.auditService.log({
        action: 'purchase-order.sent',
        resource: 'PurchaseOrder',
        resourceId: id,
        organizationId,
        userId,
        metadata: { poNumber: po.poNumber },
      });
    } catch (e) {
      this.poLogger.error(`Audit log failed: ${e.message}`);
    }

    try {
      await this.workflowEngine.processEvent({
        organizationId,
        entityType: 'purchase-order',
        entityId: id,
        eventType: 'sent',
        data: { poNumber: po.poNumber },
        createdById: userId,
      });
    } catch (e) {
      this.poLogger.error(`Workflow event failed: ${e.message}`);
    }

    return serializeDecimals(updatedPO);
  }

  async receiveItems(
    id: string,
    items: { itemId: string; receivedQuantity: number }[],
    userId: string,
    organizationId: string,
  ) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId, isDeleted: false },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');

    if (po.status !== 'Sent' && po.status !== 'PartiallyReceived') {
      throw new BadRequestException(
        'Can only receive items for Sent or PartiallyReceived purchase orders.',
      );
    }

    const updatedPO = await this.prisma.$transaction(async (tx) => {
      for (const receiveItem of items) {
        const poItem = po.items.find((i) => i.id === receiveItem.itemId);
        if (!poItem) continue;

        const newReceived = Number(poItem.receivedQuantity || 0) + receiveItem.receivedQuantity;
        const newPending = Math.max(0, Number(poItem.quantity) - newReceived);

        await tx.purchaseOrderItem.update({
          where: { id: receiveItem.itemId },
          data: {
            receivedQuantity: newReceived,
            pendingQuantity: newPending,
            receivedDate: new Date(),
          },
        });
      }

      const refreshedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });

      const allFullyReceived = refreshedItems.every((i) => Number(i.pendingQuantity || 0) <= 0);
      const anyReceived = refreshedItems.some((i) => Number(i.receivedQuantity || 0) > 0);

      let newStatus: string = po.status;
      if (allFullyReceived) {
        newStatus = 'FullyReceived';
      } else if (anyReceived) {
        newStatus = 'PartiallyReceived';
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: newStatus as any,
          ...(allFullyReceived ? { actualDeliveryDate: new Date() } : {}),
          timeline: {
            create: {
              organizationId,
              action: 'Received',
              performedById: userId,
              metadata: {
                items: items.map((i) => ({ itemId: i.itemId, qty: i.receivedQuantity })),
              },
            },
          },
        },
        include: { items: true, timeline: true },
      });
    });

    try {
      await this.auditService.log({
        action: 'purchase-order.items-received',
        resource: 'PurchaseOrder',
        resourceId: id,
        organizationId,
        userId,
        metadata: { poNumber: po.poNumber, receivedCount: items.length },
      });
    } catch (e) {
      this.poLogger.error(`Audit log failed: ${e.message}`);
    }

    try {
      await this.workflowEngine.processEvent({
        organizationId,
        entityType: 'purchase-order',
        entityId: id,
        eventType: 'items-received',
        data: { poNumber: po.poNumber, itemCount: items.length },
        createdById: userId,
      });
    } catch (e) {
      this.poLogger.error(`Workflow event failed: ${e.message}`);
    }

    return serializeDecimals(updatedPO);
  }

  async delete(id: string, deletedById: string, organizationId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId, isDeleted: false },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');

    const blockedStatuses = ['Approved', 'Sent', 'PartiallyReceived', 'FullyReceived', 'Closed'];
    if (blockedStatuses.includes(po.status)) {
      throw new BadRequestException(`Cannot delete a purchase order with status "${po.status}".`);
    }

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), deletedById },
    });

    try {
      await this.auditService.log({
        action: 'purchase-order.deleted',
        resource: 'PurchaseOrder',
        resourceId: id,
        organizationId,
        userId: deletedById,
        metadata: { poNumber: po.poNumber },
      });
    } catch (e) {
      this.poLogger.error(`Audit log failed: ${e.message}`);
    }

    try {
      await this.workflowEngine.processEvent({
        organizationId,
        entityType: 'purchase-order',
        entityId: id,
        eventType: 'deleted',
        data: { poNumber: po.poNumber },
        createdById: deletedById,
      });
    } catch (e) {
      this.poLogger.error(`Workflow event failed: ${e.message}`);
    }

    return { id };
  }

  async restore(id: string, organizationId: string) {
    return super.restore(id, organizationId);
  }

  async bulkStatusUpdate(ids: string[], status: string, organizationId: string) {
    const pos = await this.prisma.purchaseOrder.findMany({
      where: { id: { in: ids }, organizationId, isDeleted: false },
    });

    for (const po of pos) {
      if (!canTransitionStatus(po.status, status)) {
        throw new BadRequestException(
          `Cannot transition PO "${po.poNumber}" from "${po.status}" to "${status}".`,
        );
      }
    }

    return super.bulkStatusUpdate(ids, status, organizationId);
  }

  async bulkDelete(ids: string[], deletedById: string, organizationId: string) {
    return super.bulkDelete(ids, deletedById, organizationId);
  }

  async getStats(organizationId: string) {
    const where = { organizationId, isDeleted: false };
    const [
      total,
      draft,
      approved,
      pendingApproval,
      sent,
      rejected,
      partiallyReceived,
      fullyReceived,
      cancelled,
    ] = await Promise.all([
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.purchaseOrder.count({ where: { ...where, status: 'Draft' } }),
      this.prisma.purchaseOrder.count({ where: { ...where, status: 'Approved' } }),
      this.prisma.purchaseOrder.count({ where: { ...where, status: 'PendingApproval' } }),
      this.prisma.purchaseOrder.count({ where: { ...where, status: 'Sent' } }),
      this.prisma.purchaseOrder.count({ where: { ...where, status: 'Rejected' } }),
      this.prisma.purchaseOrder.count({ where: { ...where, status: 'PartiallyReceived' } }),
      this.prisma.purchaseOrder.count({ where: { ...where, status: 'FullyReceived' } }),
      this.prisma.purchaseOrder.count({ where: { ...where, status: 'Cancelled' } }),
    ]);

    const totalPurchaseResult = await this.prisma.purchaseOrder.aggregate({
      where: {
        ...where,
        status: { in: ['Approved', 'Sent', 'PartiallyReceived', 'FullyReceived'] },
      },
      _sum: { grandTotal: true },
    });

    return {
      total,
      draft,
      approved,
      pendingApproval,
      sent,
      rejected,
      partiallyReceived,
      fullyReceived,
      cancelled,
      totalPurchase: Number(totalPurchaseResult._sum.grandTotal) || 0,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getCombobox(query: any, organizationId?: string) {
    return super.getCombobox(query, organizationId, [
      'id',
      'poNumber',
      'vendorName',
      'projectName',
      'status',
      'grandTotal',
      'createdAt',
    ]);
  }
}
