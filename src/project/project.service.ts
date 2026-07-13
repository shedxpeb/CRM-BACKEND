import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetProjectsDto } from './dto/get-projects.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetProjectsDto) {
    const startTime = Date.now();
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

    const skip = (page - 1) * pageSize;
    const where: any = { isDeleted: false };

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
      'createdAt', 'projectName', 'projectCode', 'status', 'priority',
      'stage', 'progress', 'city', 'customerName', 'projectId',
    ];

    if (!allowedSortColumns.includes(sortBy)) {
      throw new BadRequestException(`Invalid sortBy column: ${sortBy}`);
    }

    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          milestones: true,
          teamMembers: true,
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    const executionTime = Date.now() - startTime;
    this.logger.log(`GET /project - Rows: ${rows.length}, Total: ${total}, Time: ${executionTime}ms`);

    return {
      rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async getStats() {
    const startTime = Date.now();

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
      this.prisma.project.count({ where: { isDeleted: false } }),
      this.prisma.project.count({ where: { isDeleted: false, status: { notIn: ['Completion', 'Cancelled', 'After Sales'] } } }),
      this.prisma.project.count({ where: { isDeleted: false, status: 'Completion' } }),
      this.prisma.project.count({ where: { isDeleted: false, healthStatus: 'Healthy' } }),
      this.prisma.project.count({ where: { isDeleted: false, healthStatus: 'At Risk' } }),
      this.prisma.project.count({ where: { isDeleted: false, healthStatus: 'Critical' } }),
      this.prisma.project.aggregate({ where: { isDeleted: false }, _sum: { value: true } }),
      this.prisma.project.aggregate({ where: { isDeleted: false }, _sum: { materialCost: true } }),
      this.prisma.project.count({ where: { isDeleted: false, endDate: { lt: new Date() }, status: { not: 'Completion' } } }),
      this.prisma.project.count({ where: { isDeleted: false, endDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } } }),
      this.prisma.project.count({ where: { isDeleted: false, stage: 'Design' } }),
      this.prisma.project.count({ where: { isDeleted: false, stage: 'Procurement' } }),
      this.prisma.project.count({ where: { isDeleted: false, stage: 'Fabrication' } }),
      this.prisma.project.count({ where: { isDeleted: false, stage: 'Installation' } }),
      this.prisma.project.count({ where: { isDeleted: false, status: { in: ['Lead', 'Estimate', 'Proposal', 'Quotation'] } } }),
    ]);

    const executionTime = Date.now() - startTime;
    this.logger.log(`GET /project/stats - Time: ${executionTime}ms`);

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
      projectRevenue: totalRevenue._sum.value || 0,
      materialCost: totalMaterialCost._sum.materialCost || 0,
      healthyProjects,
      atRiskProjects,
      criticalProjects,
    };
  }

  async findById(id: string) {
    const startTime = Date.now();

    const project = await this.prisma.project.findFirst({
      where: { id, isDeleted: false },
      include: {
        milestones: true,
        teamMembers: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const executionTime = Date.now() - startTime;
    this.logger.log(`GET /project/:id - ID: ${id}, Time: ${executionTime}ms`);

    return project;
  }

  async create(data: CreateProjectDto, createdById: string, organizationId?: string) {
    const startTime = Date.now();

    if (!organizationId) {
      throw new BadRequestException('Organization context is required to create a project');
    }

    const { milestones, team, customFields, ...restData } = data as any;

    const project = await this.prisma.project.create({
      data: {
        ...restData,
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
        customFields: customFields && Object.keys(customFields).length > 0 ? customFields : undefined,
      },
      include: {
        milestones: true,
        teamMembers: true,
      },
    });

    const executionTime = Date.now() - startTime;
    this.logger.log(`POST /project - ProjectId: ${project.projectId}, Time: ${executionTime}ms`);

    return project;
  }

  async update(id: string, data: UpdateProjectDto, updatedById?: string) {
    const startTime = Date.now();

    const existing = await this.prisma.project.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const { milestones, team, customFields, ...restData } = data as any;

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        ...restData,
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
        updatedBy: updatedById,
        ...(customFields !== undefined ? { customFields } : {}),
      },
      include: {
        milestones: true,
        teamMembers: true,
      },
    });

    // Handle milestones replacement if provided
    if (milestones) {
      await this.prisma.projectMilestone.deleteMany({ where: { projectId: id } });
      if (milestones.length > 0) {
        await this.prisma.projectMilestone.createMany({
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

    // Handle team replacement if provided
    if (team) {
      await this.prisma.projectTeamMember.deleteMany({ where: { projectId: id } });
      if (team.length > 0) {
        await this.prisma.projectTeamMember.createMany({
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

    const executionTime = Date.now() - startTime;
    this.logger.log(`PATCH /project/:id - ID: ${id}, Time: ${executionTime}ms`);

    return project;
  }

  async softDelete(id: string, deletedById: string) {
    const startTime = Date.now();

    const existing = await this.prisma.project.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById,
      },
    });

    const executionTime = Date.now() - startTime;
    this.logger.log(`DELETE /project/:id - ID: ${id}, Time: ${executionTime}ms`);

    return project;
  }

  async bulkUpdate(ids: string[], data: UpdateProjectDto, updatedById: string) {
    const startTime = Date.now();

    const { milestones, team, customFields, ...restData } = data as any;

    const result = await this.prisma.project.updateMany({
      where: { id: { in: ids }, isDeleted: false },
      data: {
        ...restData,
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
        updatedAt: new Date(),
      },
    });

    const executionTime = Date.now() - startTime;
    this.logger.log(`PATCH /project/bulk - Count: ${result.count}, Time: ${executionTime}ms`);

    return { count: result.count };
  }

  async bulkDelete(ids: string[], deletedById: string) {
    const startTime = Date.now();

    const result = await this.prisma.project.updateMany({
      where: { id: { in: ids }, isDeleted: false },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById,
      },
    });

    const executionTime = Date.now() - startTime;
    this.logger.log(`DELETE /project/bulk - Count: ${result.count}, Time: ${executionTime}ms`);

    return { count: result.count };
  }

  async getActivities(id: string) {
    const startTime = Date.now();

    const project = await this.prisma.project.findFirst({
      where: { id, isDeleted: false },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const activities = await this.prisma.projectActivity.findMany({
      where: { projectId: id },
      orderBy: { performedAt: 'desc' },
    });

    const executionTime = Date.now() - startTime;
    this.logger.log(`GET /project/:id/activities - ID: ${id}, Count: ${activities.length}, Time: ${executionTime}ms`);

    return activities;
  }

  async getTasks(id: string) {
    const startTime = Date.now();

    const project = await this.prisma.project.findFirst({
      where: { id, isDeleted: false },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const tasks = await this.prisma.projectTask.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    });

    const executionTime = Date.now() - startTime;
    this.logger.log(`GET /project/:id/tasks - ID: ${id}, Count: ${tasks.length}, Time: ${executionTime}ms`);

    return tasks;
  }

  async createTask(projectId: string, data: CreateTaskDto) {
    const startTime = Date.now();

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, isDeleted: false },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const task = await this.prisma.projectTask.create({
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

    const executionTime = Date.now() - startTime;
    this.logger.log(`POST /project/:id/tasks - ProjectId: ${projectId}, TaskId: ${task.id}, Time: ${executionTime}ms`);

    return task;
  }

  async updateTask(projectId: string, taskId: string, data: UpdateTaskDto) {
    const startTime = Date.now();

    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, projectId },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found in project ${projectId}`);
    }

    const updated = await this.prisma.projectTask.update({
      where: { id: taskId },
      data: {
        ...data,
        ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
      },
    });

    const executionTime = Date.now() - startTime;
    this.logger.log(`PATCH /project/:id/tasks/:taskId - TaskId: ${taskId}, Time: ${executionTime}ms`);

    return updated;
  }

  async deleteTask(projectId: string, taskId: string) {
    const startTime = Date.now();

    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, projectId },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found in project ${projectId}`);
    }

    await this.prisma.projectTask.delete({ where: { id: taskId } });

    const executionTime = Date.now() - startTime;
    this.logger.log(`DELETE /project/:id/tasks/:taskId - TaskId: ${taskId}, Time: ${executionTime}ms`);
  }
}
