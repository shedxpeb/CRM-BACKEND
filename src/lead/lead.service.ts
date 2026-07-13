import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetLeadsDto, LeadStatus } from './dto/get-leads.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetLeadsDto) {
    const startTime = Date.now();
    const {
      page = 1,
      pageSize = 25,
      search,
      status,
      statusMode,
      priority,
      source,
      projectType,
      structureType,
      industry,
      businessType,
      city,
      assignedEmployeeId,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * pageSize;

    // Build where clause - always exclude deleted records
    const where: any = {
      isDeleted: false,
    };

    if (search && search.length >= 2) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { website: { contains: search, mode: 'insensitive' } },
        { panNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Handle statusMode for in-progress filtering
    if (statusMode === 'in-progress') {
      // In-progress = total - new - contacted - converted
      where.status = {
        notIn: ['New', 'Contacted', 'Converted']
      };
    }

    if (priority) {
      where.priority = priority;
    }

    if (source) {
      where.source = source;
    }

    if (projectType) {
      where.projectType = projectType;
    }

    if (structureType) {
      where.structureType = structureType;
    }

    if (industry) {
      where.industry = industry;
    }

    if (businessType) {
      where.businessType = businessType;
    }

    if (city) {
      where.city = city;
    }

    if (assignedEmployeeId) {
      where.assignedToId = assignedEmployeeId;
    }

    // Handle date range filtering
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        // Set to start of the day (00:00:00)
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        where.createdAt.gte = fromDate;
      }
      if (dateTo) {
        // Set to end of the day (23:59:59.999)
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    // Validate sortBy
    const allowedSortColumns = [
      'createdAt',
      'companyName',
      'customerName',
      'priority',
      'status',
      'leadNumber',
    ];

    if (!allowedSortColumns.includes(sortBy)) {
      throw new BadRequestException(`Invalid sortBy column: ${sortBy}`);
    }

    // Fetch data and count in parallel
    const [rows, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.lead.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    // Calculate summary statistics based on current filters (reuse total from earlier)
    const [summaryNew, summaryContacted, summaryConverted] = await Promise.all([
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.New } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.Contacted } }),
      this.prisma.lead.count({ where: { ...where, isConverted: true } }),
    ]);

    // Calculate in-progress (total - new - contacted - converted)
    const summaryInProgress = Math.max(0, total - summaryNew - summaryContacted - summaryConverted);

    const summary = {
      total,
      new: summaryNew,
      contacted: summaryContacted,
      converted: summaryConverted,
      inProgress: summaryInProgress,
    };

    // Build active filters object
    const filters: any = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (source) filters.source = source;
    if (projectType) filters.projectType = projectType;
    if (structureType) filters.structureType = structureType;
    if (city) filters.city = city;
    if (assignedEmployeeId) filters.assignedEmployeeId = assignedEmployeeId;

    const executionTime = Date.now() - startTime;
    this.logger.log(`GET /lead - Rows: ${rows.length}, Total: ${total}, Time: ${executionTime}ms`);

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
      summary,
      filters,
    };
  }

  async getKanban() {
    const startTime = Date.now();

    // Get all leads excluding deleted records
    const leads = await this.prisma.lead.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        leadNumber: true,
        customerName: true,
        companyName: true,
        designation: true,
        mobile: true,
        email: true,
        city: true,
        state: true,
        industry: true,
        projectTitle: true,
        projectType: true,
        structureType: true,
        width: true,
        length: true,
        source: true,
        priority: true,
        status: true,
        score: true,
        assignedTo: true,
        remarks: true,
        isConverted: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        lastFollowUp: true,
        nextFollowUpDate: true,
      },
    });

    // Group by status
    const statusGroups = leads.reduce((acc, lead) => {
      const status = lead.status || 'Unknown';
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(lead);
      return acc;
    }, {} as Record<string, Array<typeof leads[0]>>);

    // Build columns
    const columns = Object.entries(statusGroups).map(([status, cards]: [string, Array<typeof leads[0]>]) => ({
      status,
      count: cards.length,
      cards,
    }));

    const executionTime = Date.now() - startTime;
    this.logger.log(`GET /lead/kanban - Columns: ${columns.length}, Total leads: ${leads.length}, Time: ${executionTime}ms`);

    return { columns };
  }

  async getCalendar() {
    const startTime = Date.now();

    // Get all non-deleted leads; calendar groups by nextFollowUpDate or falls back to createdAt
    const events = await this.prisma.lead.findMany({
      where: {
        isDeleted: false,
      },
      orderBy: { nextFollowUpDate: 'asc' },
      select: {
        id: true,
        leadNumber: true,
        customerName: true,
        companyName: true,
        projectTitle: true,
        status: true,
        priority: true,
        nextFollowUpDate: true,
        createdAt: true,
        mobile: true,
        email: true,
        city: true,
      },
    });

    const executionTime = Date.now() - startTime;
    this.logger.log(`GET /lead/calendar - Events: ${events.length}, Time: ${executionTime}ms`);

    return { events };
  }

  async findById(id: string) {
    const startTime = Date.now();

    const lead = await this.prisma.lead.findFirst({
      where: { id, isDeleted: false } as any,
      select: {
        id: true,
        leadNumber: true,
        customerName: true,
        companyName: true,
        designation: true,
        website: true,
        mobile: true,
        alternateMobile: true,
        email: true,
        gstNumber: true,
        panNumber: true,
        industry: true,
        businessType: true,
        addressLine1: true,
        addressLine2: true,
        area: true,
        city: true,
        state: true,
        country: true,
        pincode: true,
        companySize: true,
        annualRevenue: true,
        employeeCount: true,
        linkedin: true,
        facebook: true,
        instagram: true,
        profileImage: true,
        companyLogo: true,
        tags: true,
        projectTitle: true,
        projectType: true,
        structureType: true,
        width: true,
        length: true,
        height: true,
        baySpacing: true,
        roofType: true,
        craneRequired: true,
        craneCapacity: true,
        mezzanine: true,
        mezzanineArea: true,
        mezzanineLoad: true,
        wallType: true,
        insulationRequired: true,
        insulationType: true,
        insulationThickness: true,
        materialPreference: true,
        siteLocation: true,
        siteAddress: true,
        mapCoordinates: true,
        soilNotes: true,
        customerNotes: true,
        attachments: true,
        specialRequirement: true,
        source: true,
        priority: true,
        assignedTo: true,
        assignedToId: true,
        status: true,
        score: true,
        createdAt: true,
        lastFollowUp: true,
        nextFollowUpDate: true,
        createdBy: true,
        updatedBy: true,
        updatedAt: true,
        customerId: true,
        convertedDate: true,
        remarks: true,
        customFields: true,
        isConverted: true,
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    const executionTime = Date.now() - startTime;
    this.logger.log(`GET /lead/:id - ID: ${id}, Time: ${executionTime}ms`);

    return lead;
  }

  async create(data: CreateLeadDto, createdById: string, organizationId?: string) {
    const startTime = Date.now();

    if (!organizationId) {
      throw new BadRequestException('Organization context is required to create a lead');
    }

    this.logger.log(`CREATE - Incoming DTO: ${JSON.stringify(data)}`);

    // Check for duplicate mobile/email within the organization
    const existingLead = await this.prisma.lead.findFirst({
      where: {
        AND: [
          { organizationId },
          { isDeleted: false } as any,
          {
            OR: [
              { mobile: data.mobile },
              ...(data.email ? [{ email: data.email }] : []),
            ],
          },
        ],
      },
    });

    if (existingLead) {
      if (existingLead.mobile === data.mobile) {
        throw new BadRequestException('Lead with this mobile number already exists');
      }
      if (data.email && existingLead.email === data.email) {
        throw new BadRequestException('Lead with this email already exists');
      }
    }

    // Remove customFields from prisma data if present (stored in customFields Json column)
    const { customFields, ...restData } = data as any;
    
    const createData = {
      ...restData,
      email: data.email || '',
      organizationId,
      createdById,
      status: data.status || LeadStatus.New,
      priority: data.priority || 'Medium',
      source: data.source || 'Other',
      isConverted: false,
      attachments: [],
      ...(customFields && Object.keys(customFields).length > 0 ? { customFields } : {}),
    };

    this.logger.log(`CREATE - Prisma data: ${JSON.stringify(createData)}`);

    try {
      const lead = await this.prisma.lead.create({
        data: createData,
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(`POST /lead - LeadNumber: ${lead.leadNumber}, Time: ${executionTime}ms`);

      return lead;
    } catch (error: any) {
      this.logger.error(`CREATE - Prisma error: code=${error.code}, message=${error.message}, meta=${JSON.stringify(error.meta)}`);
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        throw new BadRequestException(`Duplicate value for field: ${target}`);
      }
      throw new BadRequestException(`Database error: ${error.message}`);
    }
  }

  async update(id: string, data: UpdateLeadDto, updatedById?: string) {
    const startTime = Date.now();

    // Check if lead exists and is not deleted
    const existingLead = await this.prisma.lead.findFirst({
      where: { id, isDeleted: false } as any,
    });

    if (!existingLead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    // Check for duplicate mobile/email if being updated
    if (data.mobile || data.email) {
      const duplicateLead = await this.prisma.lead.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { isDeleted: false } as any,
            {
              OR: [
                ...(data.mobile ? [{ mobile: data.mobile }] : []),
                ...(data.email ? [{ email: data.email }] : []),
              ],
            },
          ],
        },
      });

      if (duplicateLead) {
        if (data.mobile && duplicateLead.mobile === data.mobile) {
          throw new BadRequestException('Lead with this mobile number already exists');
        }
        if (data.email && duplicateLead.email === data.email) {
          throw new BadRequestException('Lead with this email already exists');
        }
      }
    }

    // Update lead
    try {
      const lead = await this.prisma.lead.update({
        where: { id },
        data: {
          ...(data as any),
          updatedBy: updatedById,
        },
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(`PATCH /lead/:id - ID: ${id}, Time: ${executionTime}ms`);

      return lead;
    } catch (error: any) {
      this.logger.error(`UPDATE - Prisma error: code=${error.code}, message=${error.message}, meta=${JSON.stringify(error.meta)}`);
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        throw new BadRequestException(`Duplicate value for field: ${target}`);
      }
      throw new BadRequestException(`Database error: ${error.message}`);
    }
  }

  async softDelete(id: string, deletedById: string) {
    const startTime = Date.now();

    // Check if lead exists and is not deleted
    const existingLead = await this.prisma.lead.findFirst({
      where: { id, isDeleted: false } as any,
    });

    if (!existingLead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    // Soft delete
    const lead = await this.prisma.lead.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById,
      } as any,
    });

    const executionTime = Date.now() - startTime;
    this.logger.log(`DELETE /lead/:id - ID: ${id}, Time: ${executionTime}ms`);

    return lead;
  }

  async bulkStatusUpdate(ids: string[], status: string, updatedById: string) {
    const startTime = Date.now();

    // Validate status
    const validStatuses = Object.values(LeadStatus);
    if (!validStatuses.includes(status as LeadStatus)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    // Update all leads
    const result = await this.prisma.lead.updateMany({
      where: {
        id: { in: ids },
        isDeleted: false,
      },
      data: {
        status,
        updatedAt: new Date(),
      } as any,
    });

    const executionTime = Date.now() - startTime;
    this.logger.log(`PATCH /lead/bulk/status - Count: ${result.count}, Time: ${executionTime}ms`);

    return { count: result.count };
  }

  async bulkDelete(ids: string[], deletedById: string) {
    const startTime = Date.now();

    // Soft delete all leads
    const result = await this.prisma.lead.updateMany({
      where: {
        id: { in: ids },
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById,
      } as any,
    });

    const executionTime = Date.now() - startTime;
    this.logger.log(`DELETE /lead/bulk - Count: ${result.count}, Time: ${executionTime}ms`);

    return { count: result.count };
  }

  async getLogs(id: string) {
    const startTime = Date.now();

    // Check if lead exists
    const lead = await this.prisma.lead.findFirst({
      where: { id, isDeleted: false } as any,
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    // Generate activity logs from lead history
    const logs = [
      {
        id: '1',
        action: 'Created',
        description: `Lead created by ${lead.createdById || 'system'}`,
        timestamp: lead.createdAt,
        userId: lead.createdById,
      },
      {
        id: '2',
        action: 'Updated',
        description: `Lead last updated`,
        timestamp: lead.updatedAt,
        userId: null,
      },
    ];

    // Add status change log if status exists
    if (lead.status) {
      logs.push({
        id: '3',
        action: 'Status Change',
        description: `Status changed to ${lead.status}`,
        timestamp: lead.updatedAt,
        userId: null,
      });
    }

    // Add deletion log if deleted
    if (lead.isDeleted && lead.deletedAt) {
      logs.push({
        id: '4',
        action: 'Deleted',
        description: `Lead deleted by ${lead.deletedById || 'system'}`,
        timestamp: lead.deletedAt,
        userId: lead.deletedById,
      });
    }

    const executionTime = Date.now() - startTime;
    this.logger.log(`GET /lead/:id/logs - ID: ${id}, Logs: ${logs.length}, Time: ${executionTime}ms`);

    return logs;
  }

  async updateWorkflow(id: string, stage: string, notes?: string, updatedById?: string) {
    const startTime = Date.now();

    // Check if lead exists
    const lead = await this.prisma.lead.findFirst({
      where: { id, isDeleted: false } as any,
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    // Update lead with workflow stage
    const updatedLead = await this.prisma.lead.update({
      where: { id },
      data: {
        status: stage as LeadStatus,
        remarks: notes || lead.remarks,
        updatedAt: new Date(),
      },
    });

    const executionTime = Date.now() - startTime;
    this.logger.log(`POST /lead/:id/workflow - ID: ${id}, Stage: ${stage}, Time: ${executionTime}ms`);

    return updatedLead;
  }
}
