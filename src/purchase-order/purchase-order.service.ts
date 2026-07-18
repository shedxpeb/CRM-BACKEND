import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { GetPurchaseOrdersDto } from './dto/get-purchase-orders.dto';

@Injectable()
export class PurchaseOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async generatePONumber(organizationId: string): Promise<string> {
    const lastPO = await this.prisma.purchaseOrder.findFirst({
      where: { organizationId },
      orderBy: { poNumberInt: 'desc' },
    });

    const nextNumber = lastPO ? lastPO.poNumberInt + 1 : 1;
    return `PO${String(nextNumber).padStart(6, '0')}`;
  }

  async findAll(query: GetPurchaseOrdersDto, organizationId: string) {
    const { page = 1, limit = 10, search, status, vendorId, projectId, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc', includeDeleted = false } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      isDeleted: includeDeleted ? undefined : false,
    };

    if (search) {
      where.OR = [
        { poNumber: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
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
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllForExport(query: GetPurchaseOrdersDto, organizationId: string) {
    const { search, status, vendorId, projectId, startDate, endDate, includeDeleted = false } = query;

    const where: any = {
      organizationId,
      isDeleted: includeDeleted ? undefined : false,
    };

    if (search) {
      where.OR = [
        { poNumber: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    return this.prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
      },
    });
  }

  async getStats(organizationId: string) {
    const [total, draft, approved, pendingApproval, sent] = await Promise.all([
      this.prisma.purchaseOrder.count({ where: { organizationId, isDeleted: false } }),
      this.prisma.purchaseOrder.count({ where: { organizationId, isDeleted: false, status: 'Draft' } }),
      this.prisma.purchaseOrder.count({ where: { organizationId, isDeleted: false, status: 'Approved' } }),
      this.prisma.purchaseOrder.count({ where: { organizationId, isDeleted: false, status: 'PendingApproval' } }),
      this.prisma.purchaseOrder.count({ where: { organizationId, isDeleted: false, status: 'Sent' } }),
    ]);

    const totalPurchaseResult = await this.prisma.purchaseOrder.aggregate({
      where: { organizationId, isDeleted: false, status: { in: ['Approved', 'Sent', 'PartiallyReceived', 'FullyReceived'] } },
      _sum: { grandTotal: true },
    });

    return {
      total,
      draft,
      approved,
      pendingApproval,
      sent,
      totalPurchase: totalPurchaseResult._sum.grandTotal || 0,
    };
  }

  async findById(id: string, organizationId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId, isDeleted: false },
      include: {
        items: true,
        vendor: true,
        timeline: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    return po;
  }

  async create(dto: CreatePurchaseOrderDto, createdById: string, createdBy: string, organizationId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: dto.vendorId, organizationId, isDeleted: false },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, organizationId, isDeleted: false },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }

    if (dto.warehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, organizationId, isDeleted: false },
      });

      if (!warehouse) {
        throw new NotFoundException('Warehouse not found');
      }
    }

    const poNumber = await this.generatePONumber(organizationId);

    let subtotal = 0;
    let totalTax = 0;

    const itemsWithCalculations = dto.items.map((item) => {
      const itemTotal = item.quantity * item.rate;
      const discountAmount = item.discountType === 'Percentage' 
        ? (itemTotal * (item.discount || 0)) / 100 
        : (item.discount || 0);
      const afterDiscount = itemTotal - discountAmount;
      const gstAmount = item.gstRate ? (afterDiscount * item.gstRate) / 100 : 0;
      const finalTotal = afterDiscount + gstAmount;

      subtotal += afterDiscount;
      totalTax += gstAmount;

      return {
        ...item,
        gstAmount,
        total: finalTotal,
        pendingQuantity: item.quantity,
      };
    });

    const discountAmount = dto.discountType === 'Percentage' 
      ? (subtotal * (dto.discount || 0)) / 100 
      : (dto.discount || 0);
    const afterDiscount = subtotal - discountAmount;
    const grandTotal = afterDiscount + totalTax + (dto.freight || 0);
    const roundOff = Math.round(grandTotal) - grandTotal;

    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        poNumberInt: parseInt(poNumber.replace('PO', '')),
        vendorId: dto.vendorId,
        vendorName: vendor.companyName,
        projectId: dto.projectId,
        projectName: dto.projectId ? (await this.prisma.project.findUnique({ where: { id: dto.projectId } }))?.projectName : null,
        warehouseId: dto.warehouseId,
        warehouseName: dto.warehouseId ? (await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } }))?.name : null,
        paymentTerms: dto.paymentTerms,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
        status: dto.status || 'Draft',
        subtotal: afterDiscount,
        discount: dto.discount || 0,
        discountType: dto.discountType,
        tax: totalTax,
        freight: dto.freight || 0,
        roundOff,
        grandTotal: grandTotal + roundOff,
        notes: dto.notes,
        terms: dto.terms,
        internalNotes: dto.internalNotes,
        customFields: dto.customFields,
        createdById,
        createdBy,
        organizationId,
        items: {
          create: itemsWithCalculations.map((item) => ({
            organizationId,
            itemMasterId: item.itemMasterId,
            itemCode: item.itemCode,
            itemName: item.itemName,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            gstRate: item.gstRate,
            gstAmount: item.gstAmount,
            discount: item.discount,
            discountType: item.discountType,
            total: item.total,
            hsnCode: item.hsnCode,
            pendingQuantity: item.pendingQuantity,
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
      include: {
        items: true,
        timeline: true,
      },
    });

    return purchaseOrder;
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, updatedById: string, updatedBy: string, organizationId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId, isDeleted: false },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    if (po.status === 'Approved' || po.status === 'Sent') {
      throw new BadRequestException('Cannot update approved or sent purchase orders');
    }

    if (dto.vendorId && dto.vendorId !== po.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, organizationId, isDeleted: false },
      });

      if (!vendor) {
        throw new NotFoundException('Vendor not found');
      }
    }

    let subtotal = 0;
    let totalTax = 0;

    if (dto.items) {
      const itemsWithCalculations = dto.items.map((item) => {
        const itemTotal = item.quantity * item.rate;
        const discountAmount = item.discountType === 'Percentage' 
          ? (itemTotal * (item.discount || 0)) / 100 
          : (item.discount || 0);
        const afterDiscount = itemTotal - discountAmount;
        const gstAmount = item.gstRate ? (afterDiscount * item.gstRate) / 100 : 0;
        const finalTotal = afterDiscount + gstAmount;

        subtotal += afterDiscount;
        totalTax += gstAmount;

        return {
          ...item,
          gstAmount,
          total: finalTotal,
          pendingQuantity: item.quantity,
        };
      });

      const discountAmount = dto.discountType === 'Percentage' 
        ? (subtotal * (dto.discount || 0)) / 100 
        : (dto.discount || 0);
      const afterDiscount = subtotal - discountAmount;
      const grandTotal = afterDiscount + totalTax + (dto.freight || 0);
      const roundOff = Math.round(grandTotal) - grandTotal;

      await this.prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      });

      const updatedPO = await this.prisma.purchaseOrder.update({
        where: { id },
        data: {
          vendorId: dto.vendorId,
          vendorName: dto.vendorId ? (await this.prisma.vendor.findUnique({ where: { id: dto.vendorId } }))?.companyName : po.vendorName,
          projectId: dto.projectId,
          projectName: dto.projectId ? (await this.prisma.project.findUnique({ where: { id: dto.projectId } }))?.projectName : po.projectName,
          warehouseId: dto.warehouseId,
          warehouseName: dto.warehouseId ? (await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } }))?.name : po.warehouseName,
          paymentTerms: dto.paymentTerms,
          expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : po.expectedDeliveryDate,
          status: dto.status,
          subtotal: afterDiscount,
          discount: dto.discount || 0,
          discountType: dto.discountType,
          tax: totalTax,
          freight: dto.freight || 0,
          roundOff,
          grandTotal: grandTotal + roundOff,
          notes: dto.notes,
          terms: dto.terms,
          internalNotes: dto.internalNotes,
          updatedBy,
          items: {
            create: itemsWithCalculations.map((item) => ({
              organizationId,
              itemMasterId: item.itemMasterId,
              itemCode: item.itemCode,
              itemName: item.itemName,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              rate: item.rate,
              gstRate: item.gstRate,
              gstAmount: item.gstAmount,
              discount: item.discount,
              discountType: item.discountType,
              total: item.total,
              hsnCode: item.hsnCode,
              pendingQuantity: item.pendingQuantity,
            })),
          },
          timeline: {
            create: {
              organizationId,
              action: 'Updated',
              performedById: updatedById,
              performedBy: updatedBy,
            },
          },
        },
        include: {
          items: true,
          timeline: true,
        },
      });

      return updatedPO;
    }

    const updatedPO = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        vendorId: dto.vendorId,
        projectId: dto.projectId,
        warehouseId: dto.warehouseId,
        paymentTerms: dto.paymentTerms,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : undefined,
        status: dto.status,
        discount: dto.discount,
        discountType: dto.discountType,
        freight: dto.freight,
        notes: dto.notes,
        terms: dto.terms,
        internalNotes: dto.internalNotes,
        updatedBy,
        timeline: {
          create: {
            organizationId,
            action: 'Updated',
            performedById: updatedById,
            performedBy: updatedBy,
          },
        },
      },
      include: {
        items: true,
        timeline: true,
      },
    });

    return updatedPO;
  }

  async approve(id: string, approvedById: string, approvedBy: string, organizationId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId, isDeleted: false },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    if (po.status !== 'Draft' && po.status !== 'PendingApproval') {
      throw new BadRequestException('Only draft or pending approval purchase orders can be approved');
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
      include: {
        items: true,
        timeline: true,
      },
    });

    return updatedPO;
  }

  async delete(id: string, deletedById: string, organizationId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId, isDeleted: false },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    if (po.status === 'Approved' || po.status === 'Sent') {
      throw new BadRequestException('Cannot delete approved or sent purchase orders');
    }

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById,
      },
    });

    return { id };
  }

  async bulkStatusUpdate(ids: string[], status: string, organizationId: string) {
    const result = await this.prisma.purchaseOrder.updateMany({
      where: {
        id: { in: ids },
        organizationId,
        isDeleted: false,
      },
      data: { status },
    });

    return { count: result.count };
  }

  async bulkDelete(ids: string[], deletedById: string, organizationId: string) {
    const approvedPOs = await this.prisma.purchaseOrder.count({
      where: {
        id: { in: ids },
        organizationId,
        isDeleted: false,
        status: { in: ['Approved', 'Sent'] },
      },
    });

    if (approvedPOs > 0) {
      throw new BadRequestException('Cannot delete approved or sent purchase orders');
    }

    const result = await this.prisma.purchaseOrder.updateMany({
      where: {
        id: { in: ids },
        organizationId,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById,
      },
    });

    return { count: result.count };
  }
}
