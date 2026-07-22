import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseQueryService, WhereClause, serializeDecimals } from '../common/services/base-query.service';
import { ExcelImportService, ImportResult } from '../common/services/excel-import.service';
import { AuditService } from '../auth/services/audit.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { GetLeadsDto, LeadStatus } from './dto/get-leads.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LEAD_IMPORT_CONFIG } from './dto/import-lead.dto';

@Injectable()
export class LeadService extends BaseQueryService {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly excelImportService: ExcelImportService,
    private readonly auditService: AuditService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {
    super(prisma, {
      model: 'lead',
      searchFields: [
        'customerName',
        'companyName',
        'mobile',
        'email',
        'designation',
        'website',
        'panNumber',
      ],
      filterFields: [
        'status',
        'priority',
        'source',
        'projectType',
        'structureType',
        'industry',
        'businessType',
        'city',
        'assignedToId',
      ],
      sortColumns: ['createdAt', 'companyName', 'customerName', 'priority', 'status', 'leadNumber'],
      orgScoped: true,
    });
  }

  async findAll(query: GetLeadsDto, organizationId?: string) {
    const { statusMode, assignedEmployeeId, ...restQuery } = query as GetLeadsDto & {
      assignedEmployeeId?: string;
    };
    // FE sends assignedEmployeeId; Prisma filter field is assignedToId
    const normalizedQuery = {
      ...restQuery,
      ...(assignedEmployeeId ? { assignedToId: assignedEmployeeId } : {}),
    };
    const result = await super.findAll(normalizedQuery, organizationId);

    const where: WhereClause = { isDeleted: false };
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    where.organizationId = organizationId;

    if (statusMode === 'in-progress') {
      where.status = { notIn: ['New', 'Contacted', 'Converted'] };
    }

    const [summaryNew, summaryContacted, summaryConverted, totalFiltered] = await Promise.all([
      this.client.count({ where: { ...where, status: LeadStatus.New } }),
      this.client.count({ where: { ...where, status: LeadStatus.Contacted } }),
      this.client.count({ where: { ...where, isConverted: true } }),
      this.client.count({ where }),
    ]);

    const summaryInProgress = Math.max(
      0,
      totalFiltered - summaryNew - summaryContacted - summaryConverted,
    );

    const filters: any = {};
    if (query.status) filters.status = query.status;
    if (query.priority) filters.priority = query.priority;
    if (query.source) filters.source = query.source;
    if (query.projectType) filters.projectType = query.projectType;
    if (query.structureType) filters.structureType = query.structureType;
    if (query.city) filters.city = query.city;
    if (assignedEmployeeId || (query as any).assignedToId) {
      filters.assignedToId = assignedEmployeeId || (query as any).assignedToId;
    }

    return {
      ...result,
      summary: {
        total: totalFiltered,
        new: summaryNew,
        contacted: summaryContacted,
        converted: summaryConverted,
        inProgress: summaryInProgress,
      },
      filters,
    };
  }

  async getKanban(
    filters: {
      search?: string;
      priority?: string;
      city?: string;
      assignedTo?: string;
      assignedEmployeeId?: string;
    } = {},
    organizationId?: string,
  ) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    const where: any = { isDeleted: false, organizationId };

    if (filters.search && filters.search.length >= 2) {
      where.OR = [
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { companyName: { contains: filters.search, mode: 'insensitive' } },
        { mobile: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.priority) where.priority = filters.priority;
    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
    const assigneeId = filters.assignedEmployeeId || filters.assignedTo;
    if (assigneeId) where.assignedToId = assigneeId;

    const KANBAN_MAX_TOTAL = 300;
    const KANBAN_MAX_PER_COLUMN = 50;

    const leads = await this.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: KANBAN_MAX_TOTAL,
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

    const statusGroups: Record<string, any[]> = {};
    for (const lead of leads) {
      const status = lead.status || 'Unknown';
      if (!statusGroups[status]) statusGroups[status] = [];
      if (statusGroups[status].length < KANBAN_MAX_PER_COLUMN) {
        statusGroups[status].push(lead);
      }
    }

    const columns = Object.entries(statusGroups).map(([status, cards]) => ({
      status,
      count: cards.length,
      cards,
    }));

    return { columns: serializeDecimals(columns) };
  }

  async getCalendar(
    filters: { search?: string; status?: string; priority?: string; city?: string } = {},
    organizationId?: string,
  ) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    const where: any = { isDeleted: false, organizationId };

    if (filters.search && filters.search.length >= 2) {
      where.OR = [
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { companyName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };

    const events = await this.client.findMany({
      where,
      orderBy: { nextFollowUpDate: 'asc' },
      take: 200,
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

    return { events };
  }

  async create(data: CreateLeadDto, createdById: string, organizationId?: string) {
    if (!organizationId) {
      throw new BadRequestException('Organization context is required to create a lead');
    }

    const existingLead = await this.client.findFirst({
      where: {
        AND: [
          { organizationId },
          { isDeleted: false },
          {
            OR: [{ mobile: data.mobile }, ...(data.email ? [{ email: data.email }] : [])],
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

    try {
      const lead = await this.client.create({ data: createData });
      await this.auditService.log({
        action: 'lead.created',
        organizationId,
        userId: createdById,
        resource: 'lead',
        resourceId: lead.id,
        metadata: { customerName: data.customerName, companyName: data.companyName },
      });
      await this.workflowEngine.processEvent({
        organizationId,
        entityType: 'lead',
        entityId: lead.id,
        eventType: 'created',
        data: {
          customerName: data.customerName,
          companyName: data.companyName,
          status: lead.status,
        },
        createdById,
      });
      return serializeDecimals(lead);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(`Duplicate value for field: ${error.meta?.target}`);
      }
      throw new BadRequestException(`Database error: ${error.message}`);
    }
  }

  async update(id: string, data: UpdateLeadDto, updatedById?: string, organizationId?: string) {
    const where: any = { id, isDeleted: false };
    if (!organizationId) throw new NotFoundException('Organization context required');
    where.organizationId = organizationId;
    const existingLead = await this.client.findFirst({ where });
    if (!existingLead) throw new NotFoundException(`Lead with ID ${id} not found`);

    if (data.mobile || data.email) {
      const duplicateWhere: any[] = [{ id: { not: id } }, { isDeleted: false }];
      if (organizationId) duplicateWhere.push({ organizationId });
      duplicateWhere.push({
        OR: [
          ...(data.mobile ? [{ mobile: data.mobile }] : []),
          ...(data.email ? [{ email: data.email }] : []),
        ],
      });

      const duplicateLead = await this.client.findFirst({
        where: { AND: duplicateWhere },
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

    try {
      const lead = await this.client.update({
        where: { id },
        data: { ...(data as any), updatedBy: updatedById },
      });
      await this.auditService.log({
        action: 'lead.updated',
        userId: updatedById,
        resource: 'lead',
        resourceId: id,
        metadata: { changes: Object.keys(data) },
      });
      await this.workflowEngine.processEvent({
        organizationId,
        entityType: 'lead',
        entityId: id,
        eventType: 'updated',
        data: { changes: Object.keys(data) },
        createdById: updatedById,
      });
      return serializeDecimals(lead);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(`Duplicate value for field: ${error.meta?.target}`);
      }
      throw new BadRequestException(`Database error: ${error.message}`);
    }
  }

  async getLogs(id: string, organizationId: string) {
    await this.findById(id, undefined, organizationId);
    const logs = await this.prisma.auditLog.findMany({
      where: { resource: 'lead', resourceId: id, organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      description: log.action.replace(/[._]/g, ' '),
      timestamp: log.createdAt,
      createdAt: log.createdAt,
      userId: log.userId,
      metadata: log.metadata,
    }));
  }

  async softDelete(id: string, deletedById?: string, organizationId?: string): Promise<any> {
    const result = await super.softDelete(id, deletedById, organizationId);
    await this.auditService.log({
      action: 'lead.deleted',
      userId: deletedById,
      resource: 'lead',
      resourceId: id,
    });
    await this.workflowEngine.processEvent({
      organizationId,
      entityType: 'lead',
      entityId: id,
      eventType: 'deleted',
      createdById: deletedById,
    });
    return result;
  }

  async bulkDelete(
    ids: string[],
    deletedById?: string,
    organizationId?: string,
  ): Promise<{ count: number }> {
    const result = await super.bulkDelete(ids, deletedById, organizationId);
    await this.auditService.log({
      action: 'lead.bulk-deleted',
      userId: deletedById,
      resource: 'lead',
      resourceId: ids.join(','),
      metadata: { count: result.count, ids },
    });
    if (organizationId) {
      for (const id of ids) {
        await this.workflowEngine.processEvent({
          organizationId,
          entityType: 'lead',
          entityId: id,
          eventType: 'bulk-deleted',
          data: { count: result.count },
          createdById: deletedById,
        });
      }
    }
    return result;
  }

  async bulkStatusUpdate(
    ids: string[],
    status: string,
    updatedById?: string,
    organizationId?: string,
  ): Promise<{ count: number }> {
    const result = await super.bulkStatusUpdate(ids, status, organizationId);
    await this.auditService.log({
      action: 'lead.bulk-status-updated',
      userId: updatedById,
      resource: 'lead',
      resourceId: ids.join(','),
      metadata: { count: result.count, status, ids },
    });
    if (organizationId) {
      for (const id of ids) {
        await this.workflowEngine.processEvent({
          organizationId,
          entityType: 'lead',
          entityId: id,
          eventType: 'bulk-status-updated',
          data: { status, count: result.count },
          createdById: updatedById,
        });
      }
    }
    return result;
  }

  async checkDuplicate(mobile: string, email: string | undefined, organizationId: string) {
    const existing = await this.client.findFirst({
      where: {
        organizationId,
        isDeleted: false,
        OR: [{ mobile }, ...(email ? [{ email }] : [])],
      },
    });
    return { exists: !!existing, lead: existing ? serializeDecimals(existing) : undefined };
  }

  async updateWorkflow(
    id: string,
    stage: string,
    notes: string | undefined,
    updatedById: string | undefined,
    organizationId: string,
  ) {
    const lead = await this.client.findFirst({ where: { id, isDeleted: false, organizationId } });
    if (!lead) throw new NotFoundException(`Lead with ID ${id} not found`);

    const updated = await this.client.update({
      where: { id },
      data: {
        status: stage as LeadStatus,
        remarks: notes || lead.remarks,
        updatedAt: new Date(),
      },
    });

    await this.auditService.log({
      action: 'lead.workflow-updated',
      userId: updatedById,
      resource: 'lead',
      resourceId: id,
      metadata: { from: lead.status, to: stage, notes },
    });

    await this.workflowEngine.processEvent({
      organizationId: lead.organizationId,
      entityType: 'lead',
      entityId: id,
      eventType: 'workflow-updated',
      data: { from: lead.status, to: stage, notes },
      createdById: updatedById,
    });

    return serializeDecimals(updated);
  }

  async importLeads(
    buffer: Buffer,
    createdById: string,
    organizationId: string,
  ): Promise<ImportResult> {
    if (!organizationId) {
      throw new BadRequestException('Organization context is required to import leads');
    }

    const checkExisting = async () => {
      const existingLeads = await this.client.findMany({
        where: { organizationId, isDeleted: false },
        select: { mobile: true, email: true },
      });

      const existingValues = new Map<string, Set<string>>();
      existingValues.set(
        'mobile',
        new Set(existingLeads.map((l) => l.mobile?.toLowerCase()).filter(Boolean)),
      );
      existingValues.set(
        'email',
        new Set(existingLeads.map((l) => l.email?.toLowerCase()).filter(Boolean)),
      );
      return existingValues;
    };

    const config = {
      ...LEAD_IMPORT_CONFIG,
      defaults: {
        ...LEAD_IMPORT_CONFIG.defaults,
        createdById,
        organizationId,
      },
    };

    const importResult = await this.excelImportService.processImport(
      buffer,
      config,
      async (dto) => {
        const {
          assignedToName: _assignedToName,
          createdById: _cbid,
          organizationId: _oid,
          ...leadData
        } = dto;

        const finalData = {
          ...leadData,
          organizationId,
          createdById,
          email: leadData.email || '',
          status: leadData.status || LeadStatus.New,
          isConverted: false,
          tags: leadData.tags || [],
          attachments: [],
        };

        return this.client.create({ data: finalData });
      },
      checkExisting,
    );

    await this.auditService.log({
      action: 'lead.imported',
      userId: createdById,
      organizationId,
      resource: 'lead',
      metadata: {
        imported: importResult.imported,
        skipped: importResult.skipped,
        invalid: importResult.invalid,
        total: importResult.total,
      },
    });
    await this.workflowEngine.processEvent({
      organizationId,
      entityType: 'lead',
      entityId: organizationId,
      eventType: 'imported',
      data: {
        imported: importResult.imported,
        skipped: importResult.skipped,
        invalid: importResult.invalid,
        total: importResult.total,
      },
      createdById,
    });
    return importResult;
  }
}
