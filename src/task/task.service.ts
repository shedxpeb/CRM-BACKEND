import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseQueryService, WhereClause } from '../common/services/base-query.service';
import { GetTasksDto } from './dto/get-tasks.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { VerifyTaskDto, VerifyAction } from './dto/verify-task.dto';
import {
  CreateSalaryAdjustmentDto,
  UpdateSalaryAdjustmentDto,
  GetSalaryAdjustmentsDto,
} from './dto/salary-adjustment.dto';

const TASK_INCLUDE = {
  checklist: { orderBy: { order: 'asc' } },
  comments: { where: { isDeleted: false }, orderBy: { createdAt: 'desc' } },
  attachments: { orderBy: { createdAt: 'desc' } },
  dependencies: true,
  activities: { orderBy: { createdAt: 'desc' }, take: 50 },
};

@Injectable()
export class TaskService extends BaseQueryService {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, {
      model: 'task',
      searchFields: ['title', 'description', 'assignedUserName', 'createdByName', 'notes'],
      filterFields: [
        'status',
        'priority',
        'category',
        'linkedModule',
        'assignedUserId',
        'projectId',
      ],
      sortColumns: ['createdAt', 'title', 'dueDate', 'priority', 'status', 'taskId'],
      orgScoped: true,
    });
  }

  async findAll(query: GetTasksDto, organizationId?: string) {
    const orgId = this.requireOrganizationId(organizationId);
    const { dueDateFrom, dueDateTo, ...restQuery } = query;

    const extraWhere: WhereClause = {};
    if (dueDateFrom || dueDateTo) {
      extraWhere.dueDate = {};
      if (dueDateFrom) extraWhere.dueDate.gte = new Date(dueDateFrom);
      if (dueDateTo) {
        const toDate = new Date(dueDateTo);
        toDate.setHours(23, 59, 59, 999);
        extraWhere.dueDate.lte = toDate;
      }
    }

    const result = await super.findAll(restQuery, orgId, extraWhere);
    return result;
  }

  async findById(id: string, organizationId?: string) {
    const orgId = this.requireOrganizationId(organizationId);
    return super.findById(id, TASK_INCLUDE, orgId);
  }

  async create(
    dto: CreateTaskDto,
    organizationId: string,
    createdById: string,
    createdByName: string,
  ) {
    const orgId = this.requireOrganizationId(organizationId);

    let assignedUserName = dto.assignedUserName;
    if (!assignedUserName && dto.assignedUserId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assignedUserId },
        select: { name: true },
      });
      assignedUserName = assignee?.name || dto.assignedUserId;
    }

    const task = await this.client.create({
      data: {
        organizationId: orgId,
        title: dto.title,
        description: dto.description,
        assignedUserId: dto.assignedUserId,
        assignedUserName: assignedUserName || 'Unknown',
        createdById: createdById,
        createdByName: createdByName,
        dueDate: new Date(dto.dueDate),
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        reminderDate: dto.reminderDate ? new Date(dto.reminderDate) : undefined,
        priority: dto.priority,
        status: dto.status || 'Pending',
        category: dto.category,
        linkedModule: dto.linkedModule,
        linkedRecordId: dto.linkedRecordId,
        linkedRecordName: dto.linkedRecordName,
        projectId: dto.projectId,
        leadId: dto.leadId,
        customerId: dto.customerId,
        documentId: dto.documentId,
        incentiveValue: dto.incentiveValue || 0,
        estimatedHours: dto.estimatedHours,
        tags: dto.tags || [],
        notes: dto.notes,
        beforeImages: dto.beforeImages || [],
        checklist: dto.beforeImages ? undefined : undefined,
      },
      include: TASK_INCLUDE,
    });

    await this.logActivity(
      task.id,
      'Created',
      `Task "${task.title}" created`,
      createdById,
      createdByName,
      orgId,
    );

    if (dto.beforeImages && dto.beforeImages.length > 0) {
      await this.logActivity(
        task.id,
        'Before Images Added',
        `${dto.beforeImages.length} before images uploaded`,
        createdById,
        createdByName,
        orgId,
      );
    }

    return task;
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    organizationId: string,
    updatedBy: string,
    updatedByName: string,
  ) {
    const orgId = this.requireOrganizationId(organizationId);
    const existing = await this.findById(id, orgId);

    if (
      existing.status === 'Completed' ||
      existing.status === 'Verified' ||
      existing.status === 'Closed'
    ) {
      throw new BadRequestException('Cannot update a task that is completed, verified, or closed');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { ...dto };
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.reminderDate) data.reminderDate = new Date(dto.reminderDate);

    const task = await this.client.update({
      where: { id },
      data,
      include: TASK_INCLUDE,
    });

    const changes = Object.keys(dto).filter((k) => dto[k as keyof UpdateTaskDto] !== undefined);
    if (changes.length > 0) {
      await this.logActivity(
        id,
        'Updated',
        `Task updated: ${changes.join(', ')}`,
        updatedBy,
        updatedByName,
        orgId,
      );
    }

    return task;
  }

  async deleteTask(id: string, organizationId: string, deletedById: string, deletedByName: string) {
    const orgId = this.requireOrganizationId(organizationId);
    const existing = await this.findById(id, orgId);
    await super.softDelete(id, deletedById, orgId);
    await this.logActivity(
      id,
      'Cancelled',
      `Task "${existing.title}" deleted`,
      deletedById,
      deletedByName,
      orgId,
    );
    return { message: 'Task deleted successfully' };
  }

  async complete(
    id: string,
    dto: CompleteTaskDto,
    organizationId: string,
    userId: string,
    userName: string,
  ) {
    const orgId = this.requireOrganizationId(organizationId);
    const existing = await this.findById(id, orgId);

    if (
      existing.status === 'Completed' ||
      existing.status === 'Verified' ||
      existing.status === 'Closed'
    ) {
      throw new BadRequestException('Task is already completed, verified, or closed');
    }

    if (!dto.completionProof?.afterImages || dto.completionProof.afterImages.length === 0) {
      throw new BadRequestException('After photos are required for task completion');
    }

    const task = await this.client.update({
      where: { id },
      data: {
        status: 'Completed',
        completedAt: new Date(),
        completionNotes: dto.completionNotes,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        completionProof: dto.completionProof as any,
        afterImages: dto.completionProof.afterImages,
        beforeImages: dto.completionProof.beforeImages || existing.beforeImages || [],
        timeSpent: dto.timeSpent,
        progress: 100,
      },
      include: TASK_INCLUDE,
    });

    await this.logActivity(
      id,
      'Completed',
      `Task completed. ${dto.completionNotes}`,
      userId,
      userName,
      orgId,
    );

    if (dto.completionProof.afterImages.length > 0) {
      await this.logActivity(
        id,
        'After Images Added',
        `${dto.completionProof.afterImages.length} after images uploaded`,
        userId,
        userName,
        orgId,
      );
    }

    return task;
  }

  async verify(id: string, dto: VerifyTaskDto, organizationId: string) {
    const orgId = this.requireOrganizationId(organizationId);
    const existing = await this.findById(id, orgId);

    if (existing.status !== 'Completed') {
      throw new BadRequestException('Only completed tasks can be verified or rejected');
    }

    const newStatus = dto.status === VerifyAction.Verified ? 'Verified' : 'Rejected';

    const task = await this.client.update({
      where: { id },
      data: {
        status: newStatus,
        verifiedAt: new Date(),
        verifiedBy: dto.verifiedBy,
        verifiedByName: dto.verifiedByName,
        verificationNotes: dto.verificationNotes,
      },
      include: TASK_INCLUDE,
    });

    const action = dto.status === VerifyAction.Verified ? 'Verified' : 'Rejected';
    const notes = dto.verificationNotes ? `: ${dto.verificationNotes}` : '';
    await this.logActivity(
      id,
      action,
      `Task ${action.toLowerCase()}${notes}`,
      dto.verifiedBy || '',
      dto.verifiedByName || '',
      orgId,
    );

    return task;
  }

  async getStats(organizationId: string) {
    const orgId = this.requireOrganizationId(organizationId);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
    weekEnd.setHours(23, 59, 59, 999);

    const baseWhere = { organizationId: orgId, isDeleted: false };

    const [
      totalTasks,
      openTasks,
      inProgressTasks,
      completedTasks,
      verifiedTasks,
      closedTasks,
      cancelledTasks,
      overdueTasks,
      dueToday,
      dueThisWeek,
      pendingVerification,
      completedToday,
      tasksByPriority,
      tasksByStatus,
      tasksByModule,
    ] = await Promise.all([
      this.client.count({ where: baseWhere }),
      this.client.count({ where: { ...baseWhere, status: { in: ['Pending', 'Reopened'] } } }),
      this.client.count({ where: { ...baseWhere, status: 'InProgress' } }),
      this.client.count({ where: { ...baseWhere, status: 'Completed' } }),
      this.client.count({ where: { ...baseWhere, status: 'Verified' } }),
      this.client.count({ where: { ...baseWhere, status: 'Closed' } }),
      this.client.count({ where: { ...baseWhere, status: 'Cancelled' } }),
      this.client.count({
        where: {
          ...baseWhere,
          dueDate: { lt: now },
          status: { in: ['Pending', 'InProgress', 'Reopened'] },
        },
      }),
      this.client.count({ where: { ...baseWhere, dueDate: { gte: todayStart, lte: todayEnd } } }),
      this.client.count({
        where: {
          ...baseWhere,
          dueDate: { gte: todayStart, lte: weekEnd },
          status: { in: ['Pending', 'InProgress', 'Reopened'] },
        },
      }),
      this.client.count({ where: { ...baseWhere, status: 'Completed' } }),
      this.client.count({
        where: {
          ...baseWhere,
          status: 'Completed',
          completedAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.client.groupBy({ by: ['priority'], where: baseWhere, _count: true }),
      this.client.groupBy({ by: ['status'], where: baseWhere, _count: true }),
      this.client.groupBy({
        by: ['linkedModule'],
        where: { ...baseWhere, linkedModule: { not: null } },
        _count: true,
      }),
    ]);

    const totalPaymentValue = await this.client.aggregate({
      where: baseWhere,
      _sum: { incentiveValue: true },
    });

    const paymentPending = await this.client.aggregate({
      where: { ...baseWhere, status: { in: ['Pending', 'InProgress', 'Completed', 'Reopened'] } },
      _sum: { incentiveValue: true },
    });

    const paymentProcessed = await this.client.aggregate({
      where: { ...baseWhere, status: { in: ['Verified', 'Closed'] } },
      _sum: { incentiveValue: true },
    });

    const priorityMap: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tasksByPriority.forEach((p: any) => {
      priorityMap[p.priority] = p._count;
    });

    const statusMap: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tasksByStatus.forEach((s: any) => {
      statusMap[s.status] = s._count;
    });

    const moduleMap: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tasksByModule.forEach((m: any) => {
      moduleMap[m.linkedModule || 'General'] = m._count;
    });

    return {
      totalTasks,
      openTasks,
      inProgressTasks,
      completedTasks,
      verifiedTasks,
      closedTasks,
      cancelledTasks,
      overdueTasks,
      dueToday,
      dueThisWeek,
      tasksByPriority: priorityMap,
      tasksByStatus: statusMap,
      tasksByModule: moduleMap,
      pendingVerification,
      completedToday,
      totalPaymentValue: totalPaymentValue._sum.incentiveValue || 0,
      paymentPending: paymentPending._sum.incentiveValue || 0,
      paymentProcessed: paymentProcessed._sum.incentiveValue || 0,
    };
  }

  async getDashboardKPIs(organizationId: string) {
    const orgId = this.requireOrganizationId(organizationId);
    const now = new Date();

    const [openTasks, overdueTasks, completedToday, pendingVerification, verifiedToday] =
      await Promise.all([
        this.client.count({
          where: {
            organizationId: orgId,
            isDeleted: false,
            status: { in: ['Pending', 'InProgress', 'Reopened'] },
          },
        }),
        this.client.count({
          where: {
            organizationId: orgId,
            isDeleted: false,
            dueDate: { lt: now },
            status: { in: ['Pending', 'InProgress', 'Reopened'] },
          },
        }),
        this.client.count({
          where: {
            organizationId: orgId,
            isDeleted: false,
            status: 'Completed',
            completedAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
          },
        }),
        this.client.count({
          where: { organizationId: orgId, isDeleted: false, status: 'Completed' },
        }),
        this.client.count({
          where: {
            organizationId: orgId,
            isDeleted: false,
            status: 'Verified',
            verifiedAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
          },
        }),
      ]);

    const topPerformers = await this.getEmployeePerformance(organizationId);

    return {
      openTasks,
      overdueTasks,
      completedToday,
      pendingVerification,
      verifiedToday,
      topPerformers: topPerformers.slice(0, 5),
    };
  }

  async getEmployeePerformance(organizationId: string, employeeId?: string) {
    const orgId = this.requireOrganizationId(organizationId);
    const baseWhere = { organizationId: orgId, isDeleted: false };

    const userFilter = employeeId ? { assignedUserId: employeeId } : {};
    const allTasks = await this.client.findMany({
      where: { ...baseWhere, ...userFilter },
      select: {
        id: true,
        assignedUserId: true,
        assignedUserName: true,
        status: true,
        dueDate: true,
        completedAt: true,
        verifiedAt: true,
        incentiveValue: true,
        progress: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const employeeMap = new Map<string, any>();
    for (const task of allTasks) {
      const key = task.assignedUserId;
      if (!employeeMap.has(key)) {
        employeeMap.set(key, {
          employeeId: task.assignedUserId,
          employeeName: task.assignedUserName,
          tasksAssigned: 0,
          tasksCompleted: 0,
          tasksPending: 0,
          tasksOverdue: 0,
          tasksVerified: 0,
          tasksRejected: 0,
          completionRate: 0,
          onTimeCompletionRate: 0,
          averageCompletionTime: 0,
          baseSalary: 0,
          verifiedTaskIncentives: 0,
          bonuses: 0,
          advances: 0,
          penalties: 0,
          finalPayable: 0,
          totalPaymentPending: 0,
          totalPaymentReceived: 0,
          totalPerformanceScore: 0,
        });
      }
      const emp = employeeMap.get(key);
      emp.tasksAssigned++;

      const now = new Date();
      switch (task.status) {
        case 'Completed':
        case 'Verified':
        case 'Closed':
          emp.tasksCompleted++;
          if (task.status === 'Verified' || task.status === 'Closed') {
            emp.tasksVerified++;
            emp.verifiedTaskIncentives += task.incentiveValue;
            emp.totalPaymentReceived += task.incentiveValue;
          } else {
            emp.totalPaymentPending += task.incentiveValue;
          }
          if (
            task.completedAt &&
            task.dueDate &&
            new Date(task.completedAt) <= new Date(task.dueDate)
          ) {
            emp.onTimeCompletionRate++;
          }
          if (task.completedAt && task.createdAt) {
            const diffMs =
              new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime();
            emp.averageCompletionTime += diffMs / (1000 * 60 * 60 * 24);
          }
          break;
        case 'Rejected':
          emp.tasksRejected++;
          break;
        case 'Pending':
        case 'InProgress':
        case 'Reopened':
          emp.tasksPending++;
          if (task.dueDate && new Date(task.dueDate) < now) {
            emp.tasksOverdue++;
          }
          break;
      }
    }

    const performance = Array.from(employeeMap.values()).map((emp) => {
      if (emp.tasksCompleted > 0) {
        emp.completionRate = Math.round((emp.tasksCompleted / emp.tasksAssigned) * 100);
        emp.onTimeCompletionRate = Math.round(
          (emp.onTimeCompletionRate / emp.tasksCompleted) * 100,
        );
        emp.averageCompletionTime =
          Math.round((emp.averageCompletionTime / emp.tasksCompleted) * 10) / 10;
      }
      emp.totalPerformanceScore = Math.round(
        emp.completionRate * 0.4 +
          emp.onTimeCompletionRate * 0.3 +
          Math.max(0, 100 - emp.tasksOverdue * 10) * 0.3,
      );
      emp.finalPayable =
        emp.baseSalary + emp.verifiedTaskIncentives + emp.bonuses - emp.advances - emp.penalties;
      return emp;
    });

    performance.sort((a, b) => b.totalPerformanceScore - a.totalPerformanceScore);
    performance.forEach((emp, i) => {
      emp.rank = i + 1;
      emp.percentile = Math.round(((performance.length - i) / performance.length) * 100);
    });

    return performance;
  }

  async getEmployeeSalaryLedger(
    organizationId: string,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const orgId = this.requireOrganizationId(organizationId);

    const tasks = await this.client.findMany({
      where: {
        organizationId: orgId,
        isDeleted: false,
        assignedUserId: employeeId,
        completedAt: { gte: periodStart, lte: periodEnd },
      },
      select: { incentiveValue: true, status: true },
    });

    const adjustments = await this.prisma.salaryAdjustment.findMany({
      where: {
        organizationId: orgId,
        isDeleted: false,
        employeeId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { createdAt: 'desc' },
    });

    const verifiedIncentives = tasks
      .filter((t) => t.status === 'Verified' || t.status === 'Closed')
      .reduce((sum, t) => sum + t.incentiveValue, 0);

    const bonuses = adjustments
      .filter((a) => a.type === 'Bonus' && a.status === 'Approved')
      .reduce((s, a) => s + a.amount, 0);
    const advances = adjustments
      .filter((a) => a.type === 'Advance' && a.status === 'Approved')
      .reduce((s, a) => s + a.amount, 0);
    const penalties = adjustments
      .filter((a) => a.type === 'Penalty' && a.status === 'Approved')
      .reduce((s, a) => s + a.amount, 0);
    const credits = adjustments
      .filter((a) => a.type === 'Credit' && a.status === 'Approved')
      .reduce((s, a) => s + a.amount, 0);
    const deductions = adjustments
      .filter((a) => a.type === 'Deduction' && a.status === 'Approved')
      .reduce((s, a) => s + a.amount, 0);

    return {
      employeeId,
      employeeName: tasks.length > 0 ? '' : '',
      openingBalance: 0,
      taskEarnings: verifiedIncentives,
      bonuses,
      otherCredits: credits,
      advances,
      penalties,
      otherDeductions: deductions,
      currentPayable: verifiedIncentives + bonuses + credits - advances - penalties - deductions,
      totalPaid: advances,
      lastPaymentDate: adjustments
        .filter((a) => a.type === 'Advance')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        ?.createdAt,
      adjustments,
      periodStart,
      periodEnd,
    };
  }

  async getSalaryAdjustments(query: GetSalaryAdjustmentsDto, organizationId: string) {
    const orgId = this.requireOrganizationId(organizationId);
    const {
      page = 1,
      pageSize = 25,
      employeeId,
      type,
      status,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { organizationId: orgId, isDeleted: false };
    if (employeeId) where.employeeId = employeeId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const skip = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.salaryAdjustment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.salaryAdjustment.count({ where }),
    ]);

    return {
      rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrevious: page > 1,
      },
    };
  }

  async getSalaryAdjustmentById(id: string, organizationId: string) {
    const orgId = this.requireOrganizationId(organizationId);
    const record = await this.prisma.salaryAdjustment.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
    });
    if (!record) throw new NotFoundException('Salary adjustment not found');
    return record;
  }

  async createSalaryAdjustment(
    dto: CreateSalaryAdjustmentDto,
    organizationId: string,
    createdById: string,
  ) {
    const orgId = this.requireOrganizationId(organizationId);
    return this.prisma.salaryAdjustment.create({
      data: {
        organizationId: orgId,
        employeeId: dto.employeeId,
        employeeName: dto.employeeName,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        reason: dto.reason,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        referenceName: dto.referenceName,
        notes: dto.notes,
        createdById,
      },
    });
  }

  async updateSalaryAdjustment(id: string, dto: UpdateSalaryAdjustmentDto, organizationId: string) {
    const orgId = this.requireOrganizationId(organizationId);
    const existing = await this.getSalaryAdjustmentById(id, orgId);
    if (existing.status === 'Processed') {
      throw new BadRequestException('Cannot update a processed salary adjustment');
    }
    return this.prisma.salaryAdjustment.update({
      where: { id },
      data: dto,
    });
  }

  async softDeleteSalaryAdjustment(id: string, organizationId: string) {
    const orgId = this.requireOrganizationId(organizationId);
    const existing = await this.getSalaryAdjustmentById(id, orgId);
    if (existing.status === 'Processed') {
      throw new BadRequestException('Cannot delete a processed salary adjustment');
    }
    return this.prisma.salaryAdjustment.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async approveSalaryAdjustment(
    id: string,
    approvedBy: string,
    approvedByName: string,
    organizationId: string,
  ) {
    const orgId = this.requireOrganizationId(organizationId);
    const existing = await this.getSalaryAdjustmentById(id, orgId);
    if (existing.status !== 'Pending') {
      throw new BadRequestException('Only pending adjustments can be approved');
    }
    return this.prisma.salaryAdjustment.update({
      where: { id },
      data: {
        status: 'Approved',
        approvedBy,
        approvedByName,
        approvedAt: new Date(),
      },
    });
  }

  async processSalaryAdjustment(id: string, processedBy: string, organizationId: string) {
    const orgId = this.requireOrganizationId(organizationId);
    const existing = await this.getSalaryAdjustmentById(id, orgId);
    if (existing.status !== 'Approved') {
      throw new BadRequestException('Only approved adjustments can be processed');
    }
    return this.prisma.salaryAdjustment.update({
      where: { id },
      data: {
        status: 'Processed',
        processedBy,
        processedAt: new Date(),
      },
    });
  }

  private async logActivity(
    taskId: string,
    activityType: string,
    description: string,
    performedBy: string,
    performedByName: string,
    organizationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: Record<string, any>,
  ) {
    await this.client.taskActivityLog.create({
      data: {
        taskId,
        activityType,
        description,
        performedBy,
        performedByName,
        metadata: metadata || undefined,
      },
    });
  }
}
