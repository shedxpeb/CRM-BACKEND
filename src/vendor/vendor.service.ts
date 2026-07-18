import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { GetVendorsDto } from './dto/get-vendors.dto';

@Injectable()
export class VendorService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetVendorsDto, organizationId: string) {
    const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc', includeDeleted = false } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      isDeleted: includeDeleted ? undefined : false,
    };

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { gstNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.vendor.count({ where }),
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

  async findAllForExport(query: GetVendorsDto, organizationId: string) {
    const { search, status, includeDeleted = false } = query;

    const where: any = {
      organizationId,
      isDeleted: includeDeleted ? undefined : false,
    };

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { gstNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.vendor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCombobox(query: any, organizationId: string) {
    const { search } = query;
    const where: any = {
      organizationId,
      isDeleted: false,
      status: 'Active',
    };

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.vendor.findMany({
      where,
      select: {
        id: true,
        companyName: true,
        contactPerson: true,
        email: true,
        phone: true,
      },
      orderBy: { companyName: 'asc' },
      take: 50,
    });
  }

  async getStats(organizationId: string) {
    const [total, active, inactive] = await Promise.all([
      this.prisma.vendor.count({ where: { organizationId, isDeleted: false } }),
      this.prisma.vendor.count({ where: { organizationId, isDeleted: false, status: 'Active' } }),
      this.prisma.vendor.count({ where: { organizationId, isDeleted: false, status: 'Inactive' } }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }

  async findById(id: string, organizationId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, organizationId, isDeleted: false },
      include: {
        purchaseOrders: {
          where: { isDeleted: false },
          select: {
            id: true,
            poNumber: true,
            status: true,
            grandTotal: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async create(dto: CreateVendorDto, createdById: string, createdBy: string, organizationId: string) {
    const existingVendor = await this.prisma.vendor.findFirst({
      where: {
        organizationId,
        companyName: dto.companyName,
        isDeleted: false,
      },
    });

    if (existingVendor) {
      throw new BadRequestException('Vendor with this company name already exists');
    }

    const vendor = await this.prisma.vendor.create({
      data: {
        ...dto,
        createdById,
        createdBy,
        organizationId,
      },
    });

    return vendor;
  }

  async update(id: string, dto: UpdateVendorDto, updatedById: string, updatedBy: string, organizationId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, organizationId, isDeleted: false },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (dto.companyName && dto.companyName !== vendor.companyName) {
      const existingVendor = await this.prisma.vendor.findFirst({
        where: {
          organizationId,
          companyName: dto.companyName,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (existingVendor) {
        throw new BadRequestException('Vendor with this company name already exists');
      }
    }

    const updatedVendor = await this.prisma.vendor.update({
      where: { id },
      data: {
        ...dto,
        updatedById,
        updatedBy,
      },
    });

    return updatedVendor;
  }

  async delete(id: string, deletedById: string, organizationId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, organizationId, isDeleted: false },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const hasPurchaseOrders = await this.prisma.purchaseOrder.count({
      where: { vendorId: id, isDeleted: false },
    });

    if (hasPurchaseOrders > 0) {
      throw new BadRequestException('Cannot delete vendor with existing purchase orders');
    }

    await this.prisma.vendor.update({
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
    const result = await this.prisma.vendor.updateMany({
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
    const hasPurchaseOrders = await this.prisma.purchaseOrder.count({
      where: { vendorId: { in: ids }, isDeleted: false },
    });

    if (hasPurchaseOrders > 0) {
      throw new BadRequestException('Cannot delete vendors with existing purchase orders');
    }

    const result = await this.prisma.vendor.updateMany({
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
