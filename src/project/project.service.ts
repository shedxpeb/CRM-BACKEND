import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseQueryService, serializeDecimals } from '../common/services/base-query.service';
import { AuditService } from '../auth/services/audit.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { GetProjectsDto } from './dto/get-projects.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class ProjectService extends BaseQueryService {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {
    super(prisma, {
      model: 'project',
      searchFields: ['projectName', 'projectCode', 'customerName', 'location', 'city'],
      filterFields: ['status', 'stage', 'priority', 'healthStatus', 'city', 'projectManager'],
      sortColumns: [
        'createdAt',
        'projectName',
        'projectCode',
        'status',
        'priority',
        'stage',
        'progress',
        'city',
        'customerName',
      ],
      orgScoped: true,
    });
  }

  async findAll(query: GetProjectsDto, organizationId?: string) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    const {
      page = 1,
      pageSize = 25,
      search,
      status,
      stage,
      priority,
      projectManager,
      customer,
      city,
      healthStatus,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const safePageSize = Math.min(Math.max(Number(pageSize) || 25, 1), 500);
    const skip = (page - 1) * safePageSize;
    const where: any = { isDeleted: false, organizationId };

    if (search && search.length >= 2) {
      where.OR = [
        { projectName: { contains: search, mode: 'insensitive' } },
        { projectCode: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (stage) where.stage = stage;
    if (priority) where.priority = priority;
    if (projectManager) where.projectManager = { contains: projectManager, mode: 'insensitive' };
    if (customer) where.customerName = { contains: customer, mode: 'insensitive' };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (healthStatus) where.healthStatus = healthStatus;

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

    const allowedSortColumns = [
      'createdAt',
      'projectName',
      'projectCode',
      'status',
      'priority',
      'stage',
      'progress',
      'city',
      'customerName',
    ];
    if (!allowedSortColumns.includes(sortBy)) {
      throw new BadRequestException(`Invalid sortBy column: ${sortBy}`);
    }

    // List responses stay lean — milestones/teamMembers belong on detail (findById) only
    const [rows, total] = await Promise.all([
      this.client.findMany({
        where,
        skip,
        take: safePageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.client.count({ where }),
    ]);

    const pagination = {
      page,
      pageSize: safePageSize,
      total,
      totalPages: Math.ceil(total / safePageSize),
      hasNext: page * safePageSize < total,
      hasPrevious: page > 1,
    };

    return { rows: serializeDecimals(rows), pagination };
  }

  async getStats(organizationId?: string) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    const where: any = { isDeleted: false, organizationId };

    const [
      totalProjects,
      activeProjects,
      completedProjects,
      healthyProjects,
      atRiskProjects,
      criticalProjects,
      totalRevenue,
      totalMaterialCost,
      delayedProjects,
      upcomingDeadlines,
      projectsInDesign,
      projectsInProcurement,
      projectsInFabrication,
      projectsInInstallation,
      pendingApprovals,
    ] = await Promise.all([
      this.client.count({ where }),
      this.client.count({
        where: { ...where, status: { notIn: ['Completion', 'Cancelled', 'After Sales'] } },
      }),
      this.client.count({ where: { ...where, status: 'Completion' } }),
      this.client.count({ where: { ...where, healthStatus: 'Healthy' } }),
      this.client.count({ where: { ...where, healthStatus: 'At Risk' } }),
      this.client.count({ where: { ...where, healthStatus: 'Critical' } }),
      this.client.aggregate({ where, _sum: { value: true } }),
      this.client.aggregate({ where, _sum: { materialCost: true } }),
      this.client.count({
        where: { ...where, endDate: { lt: new Date() }, status: { not: 'Completion' } },
      }),
      this.client.count({
        where: {
          ...where,
          endDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.client.count({ where: { ...where, stage: 'Design' } }),
      this.client.count({ where: { ...where, stage: 'Procurement' } }),
      this.client.count({ where: { ...where, stage: 'Fabrication' } }),
      this.client.count({ where: { ...where, stage: 'Installation' } }),
      this.client.count({
        where: { ...where, status: { in: ['Lead', 'Estimate', 'Proposal', 'Quotation'] } },
      }),
    ]);

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      delayedProjects,
      upcomingDeadlines,
      projectsInDesign,
      projectsInProcurement,
      projectsInFabrication,
      projectsInInstallation,
      pendingApprovals,
      projectRevenue: Number(totalRevenue._sum.value) || 0,
      materialCost: Number(totalMaterialCost._sum.materialCost) || 0,
      healthyProjects,
      atRiskProjects,
      criticalProjects,
    };
  }

  async findById(id: string, extraInclude?: any, organizationId?: string) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    const where: any = { id, isDeleted: false, organizationId };
    const project = await this.client.findFirst({
      where,
      include: extraInclude || { milestones: true, teamMembers: true },
    });
    if (!project) throw new NotFoundException(`Project with ID ${id} not found`);
    // Preserve FE contract (`team`) while Prisma relation is `teamMembers`
    const { teamMembers, ...rest } = project as any;
    return serializeDecimals({
      ...rest,
      teamMembers,
      team: Array.isArray(teamMembers) ? teamMembers : [],
      milestones: Array.isArray(project.milestones) ? project.milestones : [],
    });
  }

  async create(data: CreateProjectDto, createdById: string, organizationId?: string) {
    if (!organizationId) {
      throw new BadRequestException('Organization context is required to create a project');
    }

    const { milestones, team, customFields, ...restData } = data as any;

    let customerName = data.customerName;
    if (!customerName && data.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: data.customerId, organizationId, isDeleted: false },
        select: { customerName: true, companyName: true },
      });
      if (!customer) {
        throw new BadRequestException('Customer not found for this organization');
      }
      customerName = customer.customerName || customer.companyName || 'Unknown Customer';
    }
    if (!customerName) {
      throw new BadRequestException('customerName is required');
    }

    let projectManager = data.projectManager;
    if (!projectManager && data.projectManagerId) {
      const manager = await this.prisma.user.findFirst({
        where: { id: data.projectManagerId },
        select: { name: true, email: true },
      });
      projectManager = manager?.name || manager?.email || undefined;
    }

    const project = await this.client.create({
      data: {
        ...restData,
        customerName,
        projectManager,
        organizationId,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        createdById,
        milestones: milestones?.length
          ? {
              create: milestones.map((m: any) => ({
                name: m.name,
                plannedDate: m.plannedDate ? new Date(m.plannedDate) : undefined,
                actualDate: m.actualDate ? new Date(m.actualDate) : undefined,
              })),
            }
          : undefined,
        teamMembers: team?.length
          ? {
              create: team.map((t: any) => ({
                employeeId: t.employeeId,
                name: t.name,
                role: t.role,
                workload: t.workload,
              })),
            }
          : undefined,
        customFields:
          customFields && Object.keys(customFields).length > 0 ? customFields : undefined,
      },
      include: { milestones: true, teamMembers: true },
    });

    await this.auditService.log({
      action: 'project.created',
      organizationId,
      userId: createdById,
      resource: 'project',
      resourceId: project.id,
      metadata: { projectName: data.projectName, customerName },
    });

    await this.workflowEngine.processEvent({
      organizationId,
      entityType: 'project',
      entityId: project.id,
      eventType: 'created',
      data: { projectName: data.projectName, customerName },
      createdById,
    });

    return serializeDecimals(project);
  }

  async update(id: string, data: UpdateProjectDto, updatedById?: string, organizationId?: string) {
    const where: any = { id, isDeleted: false };
    if (!organizationId) throw new NotFoundException('Organization context required');
    where.organizationId = organizationId;
    const existing = await this.client.findFirst({ where });
    if (!existing) throw new NotFoundException(`Project with ID ${id} not found`);

    const { milestones, team, customFields, ...restData } = data as any;

    const project = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id },
        data: {
          ...restData,
          ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
          ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
          updatedBy: updatedById,
          ...(customFields !== undefined ? { customFields } : {}),
        },
        include: { milestones: true, teamMembers: true },
      });

      if (milestones) {
        await tx.projectMilestone.deleteMany({ where: { projectId: id } });
        if (milestones.length > 0) {
          await tx.projectMilestone.createMany({
            data: milestones.map((m: any) => ({
              projectId: id,
              name: m.name,
              plannedDate: m.plannedDate ? new Date(m.plannedDate) : undefined,
              actualDate: m.actualDate ? new Date(m.actualDate) : undefined,
              status: m.status || 'Pending',
              delay: m.delay,
            })),
          });
        }
      }

      if (team) {
        await tx.projectTeamMember.deleteMany({ where: { projectId: id } });
        if (team.length > 0) {
          await tx.projectTeamMember.createMany({
            data: team.map((t: any) => ({
              projectId: id,
              employeeId: t.employeeId,
              name: t.name,
              role: t.role,
              workload: t.workload,
            })),
          });
        }
      }

      return updated;
    });

    await this.auditService.log({
      action: 'project.updated',
      userId: updatedById,
      resource: 'project',
      resourceId: id,
      metadata: { changes: Object.keys(data) },
    });

    await this.workflowEngine.processEvent({
      organizationId,
      entityType: 'project',
      entityId: id,
      eventType: 'updated',
      data: { changes: Object.keys(data) },
      createdById: updatedById,
    });

    return serializeDecimals(project);
  }

  async bulkUpdate(
    ids: string[],
    data: UpdateProjectDto,
    updatedById: string,
    organizationId?: string,
  ) {
    const {
      milestones: _milestones,
      team: _team,
      customFields: _customFields,
      ...restData
    } = data as any;
    const where: any = { id: { in: ids }, isDeleted: false };
    if (!organizationId) throw new NotFoundException('Organization context required');
    where.organizationId = organizationId;

    const result = await this.client.updateMany({
      where,
      data: {
        ...restData,
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
        updatedAt: new Date(),
      },
    });

    await this.auditService.log({
      action: 'project.bulk-updated',
      userId: updatedById,
      resource: 'project',
      resourceId: ids.join(','),
      metadata: { count: result.count, changes: Object.keys(data), ids },
    });

    if (organizationId) {
      for (const id of ids) {
        await this.workflowEngine.processEvent({
          organizationId,
          entityType: 'project',
          entityId: id,
          eventType: 'bulk-updated',
          data: { changes: Object.keys(data), count: result.count },
          createdById: updatedById,
        });
      }
    }

    return { count: result.count };
  }

  async softDelete(id: string, deletedById?: string, organizationId?: string): Promise<any> {
    const result = await super.softDelete(id, deletedById, organizationId);
    await this.auditService.log({
      action: 'project.deleted',
      userId: deletedById,
      resource: 'project',
      resourceId: id,
    });
    await this.workflowEngine.processEvent({
      organizationId,
      entityType: 'project',
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
      action: 'project.bulk-deleted',
      userId: deletedById,
      resource: 'project',
      resourceId: ids.join(','),
      metadata: { count: result.count, ids },
    });
    if (organizationId) {
      for (const id of ids) {
        await this.workflowEngine.processEvent({
          organizationId,
          entityType: 'project',
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
      action: 'project.bulk-status-updated',
      userId: updatedById,
      resource: 'project',
      resourceId: ids.join(','),
      metadata: { count: result.count, status, ids },
    });
    return result;
  }

  async getActivities(id: string, organizationId: string) {
    await this.findById(id, undefined, organizationId);
    return this.prisma.projectActivity.findMany({
      where: { projectId: id },
      orderBy: { performedAt: 'desc' },
    });
  }

  async getTasks(id: string, organizationId: string) {
    await this.findById(id, undefined, organizationId);
    return this.prisma.projectTask.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTask(projectId: string, data: CreateTaskDto, organizationId?: string) {
    const where: any = { id: projectId, isDeleted: false };
    if (!organizationId) throw new NotFoundException('Organization context required');
    where.organizationId = organizationId;
    const project = await this.client.findFirst({ where });
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found`);

    const createdTask = await this.prisma.projectTask.create({
      data: {
        projectId,
        title: data.title,
        description: data.description,
        assignedTo: data.assignedTo,
        assignedToName: data.assignedToName,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        priority: data.priority,
        dependencies: data.dependencies || [],
      },
    });

    await this.auditService.log({
      action: 'project.task-created',
      resource: 'project',
      resourceId: projectId,
      metadata: { taskId: createdTask.id, title: data.title },
    });

    await this.workflowEngine.processEvent({
      organizationId,
      entityType: 'project',
      entityId: projectId,
      eventType: 'task-created',
      data: { taskId: createdTask.id, title: data.title },
    });

    return createdTask;
  }

  async updateTask(
    projectId: string,
    taskId: string,
    data: UpdateTaskDto,
    updatedById?: string,
    organizationId?: string,
  ) {
    const where: any = { id: projectId, isDeleted: false };
    if (!organizationId) throw new NotFoundException('Organization context required');
    where.organizationId = organizationId;
    const project = await this.client.findFirst({ where });
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found`);

    const task = await this.prisma.projectTask.findFirst({ where: { id: taskId, projectId } });
    if (!task)
      throw new NotFoundException(`Task with ID ${taskId} not found in project ${projectId}`);

    const updated = await this.prisma.projectTask.update({
      where: { id: taskId },
      data: { ...data, ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}) },
    });

    await this.auditService.log({
      action: 'project.task-updated',
      userId: updatedById,
      resource: 'project',
      resourceId: projectId,
      metadata: { taskId, changes: Object.keys(data) },
    });

    await this.workflowEngine.processEvent({
      organizationId,
      entityType: 'project',
      entityId: projectId,
      eventType: 'task-updated',
      data: { taskId, changes: Object.keys(data) },
      createdById: updatedById,
    });

    return updated;
  }

  async deleteTask(
    projectId: string,
    taskId: string,
    deletedById?: string,
    organizationId?: string,
  ) {
    const where: any = { id: projectId, isDeleted: false };
    if (!organizationId) throw new NotFoundException('Organization context required');
    where.organizationId = organizationId;
    const project = await this.client.findFirst({ where });
    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found`);

    const task = await this.prisma.projectTask.findFirst({ where: { id: taskId, projectId } });
    if (!task)
      throw new NotFoundException(`Task with ID ${taskId} not found in project ${projectId}`);
    await this.prisma.projectTask.delete({ where: { id: taskId } });

    await this.auditService.log({
      action: 'project.task-deleted',
      userId: deletedById,
      resource: 'project',
      resourceId: projectId,
      metadata: { taskId, title: task.title },
    });

    await this.workflowEngine.processEvent({
      organizationId,
      entityType: 'project',
      entityId: projectId,
      eventType: 'task-deleted',
      data: { taskId, title: task.title },
      createdById: deletedById,
    });
  }
}
