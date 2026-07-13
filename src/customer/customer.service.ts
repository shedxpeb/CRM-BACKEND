import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetCustomersDto } from './dto/get-customers.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetCustomersDto) {
    const startTime = Date.now();
    const {
      page = 1,
      pageSize = 25,
      search,
      status,
      city,
      state,
      industry,
      assignedEmployee,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * pageSize;

    const where: any = { isDeleted: false };

    if (search && search.length >= 2) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { gstNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (state) where.state = { contains: state, mode: 'insensitive' };
    if (industry) where.industry = industry;
    if (assignedEmployee) where.assignedEmployeeId = assignedEmployee;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        where.createdAt.gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    const executionTime = Date.now() - startTime;
    this.logger.log(`GET /customer - Rows: ${rows.length}, Total: ${total}, Time: ${executionTime}ms`);

    return {
      rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext,
        hasPrevious,
      },
    };
  }

  async findById(id: string) {
    const startTime = Date.now();

    const customer = await this.prisma.customer.findFirst({
      where: { id, isDeleted: false },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const executionTime = Date.now() - startTime;
    this.logger.log(`GET /customer/:id - ID: ${id}, Time: ${executionTime}ms`);

    return customer;
  }

  async create(data: CreateCustomerDto, createdById?: string, organizationId?: string) {
    const startTime = Date.now();

    if (!organizationId) {
      throw new BadRequestException('Organization context is required to create a customer');
    }

    const existingMobile = await this.prisma.customer.findFirst({
      where: { mobile: data.mobile, organizationId, isDeleted: false },
    });

    if (existingMobile) {
      throw new BadRequestException('Customer with this mobile number already exists');
    }

    if (data.email) {
      const existingEmail = await this.prisma.customer.findFirst({
        where: { email: data.email, organizationId, isDeleted: false },
      });

      if (existingEmail) {
        throw new BadRequestException('Customer with this email already exists');
      }
    }

    try {
      let customer;

      if (data.leadId) {
        const lead = await this.prisma.lead.findFirst({
          where: { id: data.leadId, isDeleted: false },
        });

        if (lead && !lead.isConverted) {
          const result = await this.prisma.$transaction(async (tx) => {
            const created = await tx.customer.create({
              data: {
                ...data as any,
                email: data.email || '',
                organizationId,
                createdById,
              },
            });

            await tx.lead.update({
              where: { id: lead.id },
              data: {
                status: 'Converted' as any,
                isConverted: true,
                customerId: created.id,
                convertedDate: new Date(),
              },
            });

            return created;
          });

          customer = result;
        } else {
          customer = await this.prisma.customer.create({
            data: {
              ...data as any,
              email: data.email || '',
              organizationId,
              createdById,
            },
          });
        }
      } else {
        customer = await this.prisma.customer.create({
          data: {
            ...data as any,
            email: data.email || '',
            organizationId,
            createdById,
          },
        });
      }

      const executionTime = Date.now() - startTime;
      this.logger.log(`POST /customer - customerId: ${customer.customerId}, Time: ${executionTime}ms`);

      return customer;
    } catch (error: any) {
      this.logger.error(`CREATE - Prisma error: code=${error.code}, message=${error.message}`);
      if (error.code === 'P2002') {
        throw new BadRequestException('Duplicate value');
      }
      throw new BadRequestException(`Database error: ${error.message}`);
    }
  }

  async update(id: string, data: UpdateCustomerDto, updatedById?: string) {
    const startTime = Date.now();

    const existing = await this.prisma.customer.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    if (data.mobile && data.mobile !== existing.mobile) {
      const duplicate = await this.prisma.customer.findFirst({
        where: { mobile: data.mobile, isDeleted: false, id: { not: id } },
      });
      if (duplicate) {
        throw new BadRequestException('Another customer with this mobile already exists');
      }
    }

    try {
      const customer = await this.prisma.customer.update({
        where: { id },
        data: {
          ...data as any,
          updatedBy: updatedById,
        },
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(`PATCH /customer/:id - ID: ${id}, Time: ${executionTime}ms`);

      return customer;
    } catch (error: any) {
      this.logger.error(`UPDATE - Prisma error: code=${error.code}, message=${error.message}`);
      if (error.code === 'P2002') {
        throw new BadRequestException('Duplicate value');
      }
      throw new BadRequestException(`Database error: ${error.message}`);
    }
  }

  async softDelete(id: string, deletedById?: string) {
    const startTime = Date.now();

    const existing = await this.prisma.customer.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById,
      },
    });

    const executionTime = Date.now() - startTime;
    this.logger.log(`DELETE /customer/:id - ID: ${id}, Time: ${executionTime}ms`);

    return customer;
  }

  async bulkStatusUpdate(ids: string[], status: string, updatedById?: string) {
    const result = await this.prisma.customer.updateMany({
      where: { id: { in: ids }, isDeleted: false },
      data: { status: status as any, updatedBy: updatedById },
    });

    return { count: result.count };
  }

  async bulkDelete(ids: string[], deletedById?: string) {
    const result = await this.prisma.customer.updateMany({
      where: { id: { in: ids }, isDeleted: false },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById,
      },
    });

    return { count: result.count };
  }

  async getStats() {
    const [totalCustomers, activeCustomers, allCustomers] = await Promise.all([
      this.prisma.customer.count({ where: { isDeleted: false } }),
      this.prisma.customer.count({ where: { isDeleted: false, status: 'Active' } }),
      this.prisma.customer.findMany({
        where: { isDeleted: false },
        select: { createdAt: true },
      }),
    ]);

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = allCustomers.filter((c) => c.createdAt >= firstOfMonth).length;

    return {
      totalCustomers,
      activeCustomers,
      newThisMonth,
      activeProjects: 0,
      completedProjects: 0,
      totalRevenue: 0,
      pendingQuotations: 0,
      pendingFollowups: 0,
    };
  }

  async getActivities(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, isDeleted: false },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return [
      {
        id: `${id}-created`,
        customerId: id,
        type: 'customer_created',
        description: 'Customer record created',
        performedBy: customer.createdBy || 'System',
        performedAt: customer.createdAt,
      },
    ];
  }

  async checkDuplicate(mobile: string, email?: string) {
    const where: any[] = [{ mobile, isDeleted: false }];
    if (email) where.push({ email, isDeleted: false });

    const customer = await this.prisma.customer.findFirst({
      where: { OR: where },
    });

    return {
      exists: !!customer,
      customer: customer || undefined,
    };
  }

  async convertLead(data: ConvertLeadDto, createdById?: string, organizationId?: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: data.leadId, isDeleted: false },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.isConverted) {
      throw new BadRequestException('Lead is already converted');
    }

    const existingMobile = await this.prisma.customer.findFirst({
      where: { mobile: data.mobile, organizationId: organizationId || lead.organizationId, isDeleted: false },
    });

    if (existingMobile) {
      throw new BadRequestException('Customer with this mobile already exists');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          customerName: data.customerName,
          companyName: data.companyName,
          mobile: data.mobile,
          alternateMobile: data.alternateMobile,
          email: data.email || '',
          gstNumber: lead.gstNumber,
          panNumber: lead.panNumber,
          industry: lead.industry,
          businessType: lead.businessType,
          website: data.website,
          address: data.address || [lead.addressLine1, lead.addressLine2, lead.area].filter(Boolean).join(', '),
          city: data.city || lead.city || '',
          state: data.state || lead.state || '',
          pincode: data.pincode || lead.pincode || '',
          source: data.source || lead.source,
          assignedEmployeeId: data.assignedEmployeeId || lead.assignedToId,
          assignedEmployee: lead.assignedTo,
          notes: data.notes || lead.remarks,
          leadId: lead.id,
          organizationId: organizationId || lead.organizationId,
          createdById,
          status: 'Active' as any,
        },
      });

      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: 'Converted' as any,
          isConverted: true,
          customerId: customer.id,
          convertedDate: new Date(),
        },
      });

      return { customer, lead: updatedLead };
    });

    return {
      customer: result.customer,
      lead: result.lead,
    };
  }
}
