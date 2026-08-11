import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PurchaseOrderStatus, LeadStatus } from '@prisma/client';
import { GetDashboardDto, resolveDateRange, ResolvedDateRange } from './dto/get-dashboard.dto';

export interface CardValue {
  value: number;
  previous: number;
  change: number;
  trend: 'up' | 'down' | 'flat';
  lastUpdated: string;
}

const COMPLETED_STATUSES = ['Completion', 'After Sales'];
const CLOSED_STATUSES = ['Cancelled', 'Completed', 'After Sales'];
const PRE_SALE_STATUSES = [
  'Lead',
  'Estimate',
  'Proposal',
  'Quotation',
  'On Hold',
  'Won',
  'Closed Won',
];
const PO_SPEND_STATUSES: PurchaseOrderStatus[] = [
  'Approved',
  'Sent',
  'PartiallyReceived',
  'FullyReceived',
  'Closed',
];
const PO_OPEN_STATUSES: PurchaseOrderStatus[] = [
  'PendingApproval',
  'Approved',
  'Sent',
  'PartiallyReceived',
];

const CATEGORY_TO_PHASE: Record<string, string> = {
  Documentation: 'Design',
  Meeting: 'Design',
  General: 'Design',
  Installation: 'Installation',
  FieldWork: 'Installation',
  Inspection: 'Installation',
};

const STAGE_TO_PHASE: Record<string, string> = {
  Design: 'Design',
  BOQ: 'Design',
  Procurement: 'Procurement',
  Fabrication: 'Fabrication',
  Dispatch: 'Dispatch',
  Installation: 'Installation',
  Handover: 'Handover',
};

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  private round(n: number, digits = 2): number {
    if (!Number.isFinite(n)) return 0;
    const p = 10 ** digits;
    return Math.round(n * p) / p;
  }

  private makeCard(current: number, previous: number): CardValue {
    const change = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
    return {
      value: this.round(current),
      previous: this.round(previous),
      change: this.round(change),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
      lastUpdated: new Date().toISOString(),
    };
  }

  private createdAtBetween(range: ResolvedDateRange, usePrevious = false) {
    const from = usePrevious ? range.previousFrom : range.from;
    const to = usePrevious ? range.previousTo : range.to;
    if (!from && !to) return {};
    const cond: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (from) cond.createdAt = { ...(cond.createdAt || {}), gte: from };
    if (to) cond.createdAt = { ...(cond.createdAt || {}), lte: to };
    return cond;
  }

  private orgScoped(organizationId?: string): string {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    return organizationId;
  }

  // ─── MONTHLY SERIES ────────────────────────────────────────────────────────

  private fillMonthly(
    rows: Array<{ month: string; value: number }>,
    monthsBack: number,
  ): Array<{ name: string; value: number }> {
    const map = new Map(rows.map((r) => [r.month, Number(r.value) || 0]));
    const out: Array<{ name: string; value: number }> = [];
    const now = new Date();
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push({
        name: `${MONTH_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        value: map.get(key) || 0,
      });
    }
    return out;
  }

  private async monthlySeries(
    orgId: string,
    opts: {
      table: string;
      valueColumn?: string;
      extraWhere?: string;
      dateColumn?: string;
      includeSoftDelete?: boolean;
    },
    monthsBack = 12,
  ): Promise<Array<{ name: string; value: number }>> {
    const dateCol = opts.dateColumn || '"createdAt"';
    const valueExpr = opts.valueColumn
      ? `COALESCE(SUM(${opts.valueColumn}), 0)::float8`
      : `COUNT(*)::int`;
    const softDelete = opts.includeSoftDelete === false ? '' : ' AND "isDeleted" = false';
    const extra = opts.extraWhere ? ` AND ${opts.extraWhere}` : '';
    try {
      const rows = await this.prisma.$queryRawUnsafe(
        `SELECT to_char(date_trunc('month', ${dateCol}), 'YYYY-MM') AS month,
                ${valueExpr} AS value
         FROM "${opts.table}"
         WHERE "organizationId" = $1${softDelete}${extra}
         GROUP BY 1 ORDER BY 1`,
        orgId,
      );
      return this.fillMonthly(rows as Array<{ month: string; value: number }>, monthsBack);
    } catch (err) {
      this.logger.warn(`monthlySeries failed for ${opts.table}: ${(err as Error).message}`);
      return this.fillMonthly([], monthsBack);
    }
  }

  private async groupByCount(
    model: string,
    by: string,
    orgId: string,
    extraWhere: Record<string, unknown> = {},
  ): Promise<Array<{ name: string; value: number }>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (this.prisma as any)[model].groupBy({
      by: [by],
      where: { organizationId: orgId, isDeleted: false, ...extraWhere },
      _count: { _all: true },
    });
    return rows
      .filter((r: Record<string, unknown>) => r[by] != null)
      .map((r: Record<string, unknown>) => ({
        name: String(r[by]),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: (r._count as any)._all as number,
      }));
  }

  // ─── OVERVIEW ──────────────────────────────────────────────────────────────

  async getOverview(dto: GetDashboardDto, organizationId: string, userId?: string) {
    const started = Date.now();
    const orgId = this.orgScoped(organizationId);
    const range = resolveDateRange(dto);
    const now = new Date();

    const [
      summary,
      charts,
      projects,
      timeline,
      notifications,
      activities,
      inventory,
      purchase,
      leads,
      tasks,
    ] = await Promise.all([
      this.buildSummary(orgId, range, now),
      this.buildCharts(orgId),
      this.buildProjects(orgId, range, now),
      this.buildTimeline(orgId, range, now),
      this.buildNotifications(orgId, userId),
      this.buildActivities(orgId),
      this.buildInventory(orgId),
      this.buildPurchase(orgId, range),
      this.buildLeads(orgId, range),
      this.buildTasks(orgId, range, now),
    ]);

    const revenue = summary.revenue;
    const expenses = summary.expenses;

    return {
      generatedAt: new Date().toISOString(),
      dateRange: {
        key: range.key,
        label: range.label,
        from: range.from,
        to: range.to,
      },
      performance: {
        executionMs: Date.now() - started,
      },
      summary: {
        ...summary,
        profit: {
          ...this.makeCard(revenue.value - expenses.value, revenue.previous - expenses.previous),
          lastUpdated: new Date().toISOString(),
        },
      },
      charts,
      projects,
      timeline,
      notifications,
      activities,
      inventory,
      purchase,
      leads,
      tasks,
      revenue: {
        total: revenue.value,
        expenses: expenses.value,
        profit: revenue.value - expenses.value,
        pendingSales: projects.pendingSalesValue,
        monthlyGrowth: this.monthlyGrowth(charts.revenueTrend),
      },
    };
  }

  // ─── SUMMARY ───────────────────────────────────────────────────────────────

  private async buildSummary(orgId: string, range: ResolvedDateRange, now: Date) {
    const current = this.createdAtBetween(range, false);
    const previous = this.createdAtBetween(range, true);

    const [
      leadsCount,
      leadsPrevious,
      leadsTotal,
      leadsConvertedInPeriod,
      customersCount,
      customersPrevious,
      customersTotal,
      projectsCount,
      projectsPrevious,
      projectsTotal,
      projectsActive,
      projectsCompleted,
      projectsDelayed,
      poCount,
      poPrevious,
      poTotal,
      poOpen,
      poCompleted,
      poCancelled,
      inventoryTotalValue,
      inventoryPreviousValue,
      inventoryItems,
      inventoryLowStock,
      revenueTotal,
      revenuePrevious,
      expenseTotal,
      expensePrevious,
      tasksCount,
      tasksPrevious,
      tasksToday,
      tasksOverdue,
      tasksCompleted,
      notificationTotal,
      notificationUnread,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { organizationId: orgId, isDeleted: false, ...current } }),
      this.prisma.lead.count({ where: { organizationId: orgId, isDeleted: false, ...previous } }),
      this.prisma.lead.count({ where: { organizationId: orgId, isDeleted: false } }),
      this.prisma.lead.count({
        where: {
          organizationId: orgId,
          isDeleted: false,
          convertedDate: current.createdAt ?? { gte: new Date(0) },
        },
      }),
      this.prisma.customer.count({
        where: { organizationId: orgId, isDeleted: false, ...current },
      }),
      this.prisma.customer.count({
        where: { organizationId: orgId, isDeleted: false, ...previous },
      }),
      this.prisma.customer.count({ where: { organizationId: orgId, isDeleted: false } }),
      this.prisma.project.count({ where: { organizationId: orgId, isDeleted: false, ...current } }),
      this.prisma.project.count({
        where: { organizationId: orgId, isDeleted: false, ...previous },
      }),
      this.prisma.project.count({ where: { organizationId: orgId, isDeleted: false } }),
      this.prisma.project.count({
        where: {
          organizationId: orgId,
          isDeleted: false,
          status: { notIn: COMPLETED_STATUSES.concat(['Cancelled']) },
        },
      }),
      this.prisma.project.count({
        where: { organizationId: orgId, isDeleted: false, status: 'Completion' },
      }),
      this.prisma.project.count({
        where: {
          organizationId: orgId,
          isDeleted: false,
          endDate: { lt: now },
          status: { notIn: CLOSED_STATUSES },
        },
      }),
      this.prisma.purchaseOrder.count({
        where: { organizationId: orgId, isDeleted: false, ...current },
      }),
      this.prisma.purchaseOrder.count({
        where: { organizationId: orgId, isDeleted: false, ...previous },
      }),
      this.prisma.purchaseOrder.count({ where: { organizationId: orgId, isDeleted: false } }),
      this.prisma.purchaseOrder.count({
        where: { organizationId: orgId, isDeleted: false, status: { in: PO_OPEN_STATUSES } },
      }),
      this.prisma.purchaseOrder.count({
        where: {
          organizationId: orgId,
          isDeleted: false,
          status: { in: ['FullyReceived', 'Closed'] },
        },
      }),
      this.prisma.purchaseOrder.count({
        where: { organizationId: orgId, isDeleted: false, status: 'Cancelled' },
      }),
      this.prisma.inventoryItem.aggregate({
        where: { organizationId: orgId, isDeleted: false },
        _sum: { totalValue: true },
      }),
      this.prisma.inventoryItem.aggregate({
        where: { organizationId: orgId, isDeleted: false, ...current },
        _sum: { totalValue: true },
      }),
      this.prisma.inventoryItem.count({ where: { organizationId: orgId, isDeleted: false } }),
      this.prisma.inventoryItem.count({
        where: {
          organizationId: orgId,
          isDeleted: false,
          status: { in: ['Low Stock', 'Critical'] },
        },
      }),
      this.prisma.project.aggregate({
        where: { organizationId: orgId, isDeleted: false, ...current },
        _sum: { value: true },
      }),
      this.prisma.project.aggregate({
        where: { organizationId: orgId, isDeleted: false, ...previous },
        _sum: { value: true },
      }),
      this.prisma.purchaseOrder.aggregate({
        where: {
          organizationId: orgId,
          isDeleted: false,
          status: { in: PO_SPEND_STATUSES },
          ...current,
        },
        _sum: { grandTotal: true },
      }),
      this.prisma.purchaseOrder.aggregate({
        where: {
          organizationId: orgId,
          isDeleted: false,
          status: { in: PO_SPEND_STATUSES },
          ...previous,
        },
        _sum: { grandTotal: true },
      }),
      this.prisma.task.count({ where: { organizationId: orgId, isDeleted: false, ...current } }),
      this.prisma.task.count({ where: { organizationId: orgId, isDeleted: false, ...previous } }),
      this.prisma.task.count({
        where: {
          organizationId: orgId,
          isDeleted: false,
          dueDate: { gte: this.startOfDay(now), lte: this.endOfDay(now) },
        },
      }),
      this.prisma.task.count({
        where: {
          organizationId: orgId,
          isDeleted: false,
          dueDate: { lt: now },
          status: { in: ['Pending', 'InProgress', 'Reopened', 'Blocked'] },
        },
      }),
      this.prisma.task.count({
        where: {
          organizationId: orgId,
          isDeleted: false,
          status: { in: ['Completed', 'Verified', 'Closed'] },
        },
      }),
      this.prisma.notification.count({ where: { organizationId: orgId } }),
      this.prisma.notification.count({ where: { organizationId: orgId, isRead: false } }),
    ]);

    const conversionRate =
      leadsCount > 0 ? this.round((leadsConvertedInPeriod / leadsCount) * 100) : 0;

    const revenueCurrent = Number(revenueTotal._sum.value) || 0;
    const revenuePrev = Number(revenuePrevious._sum.value) || 0;
    const expenseCurrent = Number(expenseTotal._sum?.grandTotal) || 0;
    const expensePrev = Number(expensePrevious._sum?.grandTotal) || 0;

    return {
      leads: {
        ...this.makeCard(leadsCount, leadsPrevious),
        total: leadsTotal,
        newInPeriod: leadsCount,
        converted: leadsConvertedInPeriod,
        conversionRate,
      },
      customers: {
        ...this.makeCard(customersCount, customersPrevious),
        total: customersTotal,
        active: customersCount,
      },
      projects: {
        ...this.makeCard(projectsCount, projectsPrevious),
        total: projectsTotal,
        active: projectsActive,
        completed: projectsCompleted,
        delayed: projectsDelayed,
      },
      purchaseOrders: {
        ...this.makeCard(poCount, poPrevious),
        total: poTotal,
        open: poOpen,
        completed: poCompleted,
        cancelled: poCancelled,
      },
      inventory: {
        ...this.makeCard(
          Number(inventoryTotalValue._sum.totalValue) || 0,
          Number(inventoryPreviousValue._sum.totalValue) || 0,
        ),
        totalValue: Number(inventoryTotalValue._sum.totalValue) || 0,
        items: inventoryItems,
        lowStock: inventoryLowStock,
      },
      revenue: this.makeCard(revenueCurrent, revenuePrev),
      expenses: this.makeCard(expenseCurrent, expensePrev),
      tasks: {
        ...this.makeCard(tasksCount, tasksPrevious),
        today: tasksToday,
        overdue: tasksOverdue,
        completed: tasksCompleted,
      },
      notifications: {
        ...this.makeCard(notificationUnread, 0),
        total: notificationTotal,
        unread: notificationUnread,
      },
    };
  }

  // ─── CHARTS ────────────────────────────────────────────────────────────────

  private async buildCharts(orgId: string) {
    const [
      salesTrend,
      purchaseTrend,
      revenueTrend,
      expenseTrend,
      monthlyLeads,
      monthlyCustomers,
      projectCompletion,
      inventoryValueTrend,
      movementTrend,
      leadSource,
      leadStatus,
      projectsByStatus,
      inventoryByCategory,
      purchaseStatus,
      taskStatus,
    ] = await Promise.all([
      this.monthlySeries(orgId, {
        table: 'Project',
        valueColumn: '"value"',
        extraWhere: `"status" NOT IN ('Cancelled')`,
      }),
      this.monthlySeries(orgId, {
        table: 'PurchaseOrder',
        valueColumn: '"grandTotal"',
        extraWhere: `"status" IN (${PO_SPEND_STATUSES.map((s) => `'${s}'`).join(', ')})`,
      }),
      this.monthlySeries(orgId, { table: 'Project', valueColumn: '"value"' }),
      this.monthlySeries(orgId, {
        table: 'PurchaseOrder',
        valueColumn: '"grandTotal"',
        extraWhere: `"status" IN (${PO_SPEND_STATUSES.map((s) => `'${s}'`).join(', ')})`,
      }),
      this.monthlySeries(orgId, { table: 'Lead' }),
      this.monthlySeries(orgId, { table: 'Customer' }),
      this.monthlySeries(orgId, {
        table: 'Project',
        extraWhere: `("status" = 'Completion' OR "progress" >= 100)`,
      }),
      this.monthlySeries(orgId, {
        table: 'InventoryItem',
        valueColumn: '"totalValue"',
      }),
      this.monthlySeries(
        orgId,
        {
          table: 'StockMovement',
          dateColumn: '"date"',
          includeSoftDelete: false,
        },
        6,
      ),
      this.groupByCount('lead', 'source', orgId),
      this.groupByCount('lead', 'status', orgId),
      this.groupByCount('project', 'status', orgId),
      this.groupByCount('inventoryItem', 'category', orgId),
      this.groupByCount('purchaseOrder', 'status', orgId),
      this.groupByCount('task', 'status', orgId),
    ]);

    const revenueVsExpense = revenueTrend.map((r, i) => ({
      name: r.name,
      revenue: r.value,
      expense: expenseTrend[i]?.value || 0,
    }));

    const cashFlow = movementTrend.map((m) => ({
      name: m.name,
      inflow: m.value,
      outflow: 0,
    }));

    return {
      salesTrend,
      purchaseTrend,
      revenueTrend,
      expenseTrend,
      revenueVsExpense,
      monthlyLeads,
      monthlyCustomers,
      projectsByStatus,
      projectCompletion,
      inventoryByCategory,
      inventoryValueTrend,
      purchaseStatus,
      taskStatus,
      leadSource,
      leadStatus,
      cashFlow,
      profitTrend: revenueTrend.map((r, i) => ({
        name: r.name,
        value: r.value - (expenseTrend[i]?.value || 0),
      })),
    };
  }

  private monthlyGrowth(series: Array<{ name: string; value: number }>): number {
    const withValues = series.filter((s) => s.value > 0);
    if (withValues.length === 0) return 0;
    const last = withValues[withValues.length - 1].value;
    const prev = withValues.length > 1 ? withValues[withValues.length - 2].value : 0;
    if (prev <= 0) return last > 0 ? 100 : 0;
    return this.round(((last - prev) / prev) * 100);
  }

  // ─── PROJECTS ──────────────────────────────────────────────────────────────

  private async buildProjects(orgId: string, range: ResolvedDateRange, now: Date) {
    const lean = await this.prisma.project.findMany({
      where: { organizationId: orgId, isDeleted: false },
      select: {
        id: true,
        projectName: true,
        projectCode: true,
        customerName: true,
        status: true,
        progress: true,
        startDate: true,
        endDate: true,
        healthStatus: true,
        value: true,
        projectType: true,
        city: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { endDate: 'asc' },
    });

    const buckets = {
      onTrack: 0,
      atRisk: 0,
      overdue: 0,
      completed: 0,
      cancelled: 0,
      pending: 0,
      inProgress: 0,
      blocked: 0,
    };

    let pendingSalesValue = 0;
    let totalValue = 0;

    for (const p of lean) {
      totalValue += Number(p.value) || 0;
      if (!CLOSED_STATUSES.includes(p.status) && p.status !== 'Cancelled') {
        pendingSalesValue += Number(p.value) || 0;
      }
      if (p.status === 'Cancelled') {
        buckets.cancelled += 1;
      } else if (COMPLETED_STATUSES.includes(p.status) || (p.progress ?? 0) >= 100) {
        buckets.completed += 1;
      } else if (p.endDate && p.endDate.getTime() < now.getTime()) {
        buckets.overdue += 1;
      } else if (p.healthStatus === 'At Risk' || p.healthStatus === 'Critical') {
        buckets.atRisk += 1;
      } else if (p.status === 'Blocked') {
        buckets.blocked += 1;
      } else if (PRE_SALE_STATUSES.includes(p.status)) {
        buckets.pending += 1;
      } else if (!p.startDate || p.startDate.getTime() > now.getTime()) {
        buckets.pending += 1;
      } else {
        buckets.onTrack += 1;
      }
    }

    const total = lean.length;
    const completedPercent = total > 0 ? this.round((buckets.completed / total) * 100) : 0;
    const overduePercent = total > 0 ? this.round((buckets.overdue / total) * 100) : 0;
    const statusCounts: Record<string, number> = {};
    for (const p of lean) {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    }
    const healthCounts: Record<string, number> = {};
    for (const p of lean) {
      healthCounts[p.healthStatus] = (healthCounts[p.healthStatus] || 0) + 1;
    }
    const byStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    const byHealth = Object.entries(healthCounts).map(([name, value]) => ({ name, value }));

    return {
      total,
      active: buckets.onTrack + buckets.atRisk + buckets.inProgress + buckets.blocked,
      completed: buckets.completed,
      cancelled: buckets.cancelled,
      pending: buckets.pending,
      onTrack: buckets.onTrack,
      atRisk: buckets.atRisk,
      overdue: buckets.overdue,
      blocked: buckets.blocked,
      delayed: buckets.overdue,
      completedPercent,
      overduePercent,
      byStatus,
      byHealth,
      totalValue: this.round(totalValue),
      pendingSalesValue: this.round(pendingSalesValue),
    };
  }

  // ─── TIMELINE ──────────────────────────────────────────────────────────────

  private async buildTimeline(orgId: string, range: ResolvedDateRange, now: Date) {
    const todayStart = this.startOfDay(now);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthEnd = new Date(now);
    monthEnd.setDate(monthEnd.getDate() + 30);

    const [projects, milestones, tasks] = await Promise.all([
      this.prisma.project.findMany({
        where: { organizationId: orgId, isDeleted: false, endDate: { not: null } },
        select: {
          id: true,
          projectName: true,
          projectCode: true,
          status: true,
          progress: true,
          startDate: true,
          endDate: true,
        },
        orderBy: { endDate: 'asc' },
      }),
      this.prisma.projectMilestone.findMany({
        where: { project: { organizationId: orgId }, plannedDate: { not: null } },
        select: {
          id: true,
          name: true,
          plannedDate: true,
          status: true,
          project: { select: { id: true, projectName: true, projectCode: true, status: true } },
        },
        orderBy: { plannedDate: 'asc' },
      }),
      this.prisma.task.findMany({
        where: { organizationId: orgId, isDeleted: false },
        select: { id: true, title: true, dueDate: true, status: true, projectId: true },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    const projectByName = new Map(projects.map((p) => [p.id, p.projectName || p.projectCode]));
    const inDay = (d: Date | null, target: Date) =>
      !!d && d.getTime() >= todayStart.getTime() && d.getTime() <= this.endOfDay(target).getTime();
    const before = (d: Date | null, t: Date) => !!d && d.getTime() < t.getTime();
    const notClosed = (status: string) =>
      !CLOSED_STATUSES.includes(status) && status !== 'Cancelled';

    const today: Array<Record<string, unknown>> = [];
    const thisWeek: Array<Record<string, unknown>> = [];
    const thisMonth: Array<Record<string, unknown>> = [];
    const late: Array<Record<string, unknown>> = [];
    const completed: Array<Record<string, unknown>> = [];

    for (const p of projects) {
      const base = {
        id: p.id,
        type: 'project' as const,
        entityId: p.id,
        title: p.projectName,
        code: p.projectCode,
        status: p.status,
        progress: p.progress,
      };
      if (COMPLETED_STATUSES.includes(p.status) || (p.progress ?? 0) >= 100) {
        completed.push({ ...base, date: p.endDate });
      } else if (before(p.endDate, now) && notClosed(p.status)) {
        late.push({ ...base, date: p.endDate });
      }
      if (p.endDate && notClosed(p.status)) {
        if (inDay(p.endDate, now)) today.push({ ...base, date: p.endDate });
        else if (p.endDate.getTime() <= weekEnd.getTime())
          thisWeek.push({ ...base, date: p.endDate });
        else if (p.endDate.getTime() <= monthEnd.getTime())
          thisMonth.push({ ...base, date: p.endDate });
      }
    }

    for (const m of milestones) {
      const base = {
        id: m.id,
        type: 'milestone' as const,
        entityId: m.id,
        title: m.name,
        code: m.project.projectCode,
        projectName: m.project.projectName,
        status: m.status,
      };
      if (m.plannedDate) {
        if (inDay(m.plannedDate, now)) today.push({ ...base, date: m.plannedDate });
        else if (m.plannedDate.getTime() <= weekEnd.getTime())
          thisWeek.push({ ...base, date: m.plannedDate });
        else if (m.plannedDate.getTime() <= monthEnd.getTime())
          thisMonth.push({ ...base, date: m.plannedDate });
      }
    }

    for (const t of tasks) {
      const base = {
        id: t.id,
        type: 'task' as const,
        entityId: t.id,
        title: t.title,
        code: projectByName.get(t.projectId || '') || '—',
        projectName: projectByName.get(t.projectId || '') || '—',
        status: t.status,
      };
      if (t.dueDate) {
        if (inDay(t.dueDate, now)) today.push({ ...base, date: t.dueDate });
        else if (t.dueDate.getTime() <= weekEnd.getTime())
          thisWeek.push({ ...base, date: t.dueDate });
        else if (t.dueDate.getTime() <= monthEnd.getTime())
          thisMonth.push({ ...base, date: t.dueDate });
        if (
          before(t.dueDate, now) &&
          ['Pending', 'InProgress', 'Reopened', 'Blocked'].includes(t.status)
        ) {
          late.push({ ...base, date: t.dueDate });
        }
      }
    }

    const sortByDate = (arr: Array<Record<string, unknown>>) =>
      arr.sort((a, b) => new Date(a.date as Date).getTime() - new Date(b.date as Date).getTime());

    return {
      today: sortByDate(today).slice(0, 20),
      thisWeek: sortByDate(thisWeek).slice(0, 20),
      thisMonth: sortByDate(thisMonth).slice(0, 20),
      late: sortByDate(late).slice(0, 20),
      completed: completed.slice(0, 20),
    };
  }

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────────

  private async buildNotifications(orgId: string, userId?: string) {
    const [total, unread, recent] = await Promise.all([
      this.prisma.notification.count({ where: { organizationId: orgId } }),
      this.prisma.notification.count({ where: { organizationId: orgId, isRead: false } }),
      this.prisma.notification.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          userId: true,
          title: true,
          message: true,
          type: true,
          entityType: true,
          entityId: true,
          isRead: true,
          createdAt: true,
        },
      }),
    ]);

    const mentions = recent.filter((n) => n.userId === userId).length;

    return {
      total,
      unread,
      mentions,
      recent: recent.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        entityType: n.entityType,
        entityId: n.entityId,
        isRead: n.isRead,
        isMention: n.userId === userId,
        createdAt: n.createdAt,
      })),
    };
  }

  // ─── ACTIVITIES / STATUS UPDATES ───────────────────────────────────────────

  private readonly ENTITY_SELECT: Record<string, Record<string, boolean>> = {
    project: { id: true, projectName: true, projectCode: true },
    lead: { id: true, customerName: true, companyName: true },
    customer: { id: true, customerName: true },
    task: { id: true, title: true },
    'purchase-order': { id: true, poNumber: true },
    inventory: { id: true, itemName: true },
  };

  private async buildActivities(orgId: string) {
    const history = await this.prisma.statusHistory.findMany({
      where: { organizationId: orgId },
      orderBy: { changedAt: 'desc' },
      take: 25,
    });

    if (history.length === 0) {
      return this.buildFallbackActivities(orgId);
    }

    const grouped = new Map<string, string[]>();
    for (const h of history) {
      const list = grouped.get(h.entityType) || [];
      if (list.length < 500) list.push(h.entityId);
      grouped.set(h.entityType, list);
    }

    const [projects, leads, customers, tasks, purchaseOrders, inventoryItems, users] =
      await Promise.all([
        this.batchEntity(orgId, 'project', 'project', grouped.get('project')),
        this.batchEntity(orgId, 'lead', 'lead', grouped.get('lead')),
        this.batchEntity(orgId, 'customer', 'customer', grouped.get('customer')),
        this.batchEntity(orgId, 'task', 'task', grouped.get('task')),
        this.batchEntity(orgId, 'purchaseOrder', 'purchase-order', grouped.get('purchase-order')),
        this.batchEntity(orgId, 'inventoryItem', 'inventory', grouped.get('inventory')),
        this.prisma.user.findMany({
          where: {
            organizationId: orgId,
            id: {
              in: [
                ...new Set(
                  history.map((h) => h.changedById).filter((x): x is string => Boolean(x)),
                ),
              ],
            },
          },
          select: { id: true, name: true, email: true, avatar: true },
        }),
      ]);

    const nameByType: Record<string, Map<string, string>> = {
      project: new Map(projects.map((e) => [e.id, e.projectName || e.projectCode])),
      lead: new Map(leads.map((e) => [e.id, e.customerName || e.companyName])),
      customer: new Map(customers.map((e) => [e.id, e.customerName])),
      task: new Map(tasks.map((e) => [e.id, e.title])),
      'purchase-order': new Map(purchaseOrders.map((e) => [e.id, e.poNumber])),
      inventory: new Map(inventoryItems.map((e) => [e.id, e.itemName])),
    };
    const codeByType: Record<string, Map<string, string>> = {
      project: new Map(projects.map((e) => [e.id, e.projectCode])),
    };
    const userMap = new Map(users.map((u) => [u.id, u]));

    const items = history.map((h, i) => {
      const entityKey =
        h.entityType === 'purchaseOrder' ? 'purchase-order' : h.entityType || 'entity';
      const entityMap = nameByType[entityKey] || new Map();
      const codeMap = codeByType[entityKey] || new Map();
      const user = h.changedById ? userMap.get(h.changedById) : undefined;
      return {
        id: `status-${h.id || i}`,
        entityType: h.entityType,
        entityId: h.entityId,
        entityName: entityMap.get(h.entityId) || h.entityId,
        projectCode: codeMap.get(h.entityId) || '',
        projectName: h.entityType === 'project' ? entityMap.get(h.entityId) || '' : '',
        previousStatus: h.fromStatus,
        currentStatus: h.toStatus,
        user: user?.name || user?.email || (h.changedById ? 'System' : 'System'),
        userId: h.changedById,
        avatar: user?.avatar || undefined,
        reason: h.reason,
        timestamp: h.changedAt,
        clickable: true,
      };
    });

    return items;
  }

  private async batchEntity(orgId: string, model: string, key: string, ids: string[] | undefined) {
    if (!ids || ids.length === 0) return [];
    const select = this.ENTITY_SELECT[key] || { id: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.prisma as any)[model].findMany({
      where: { id: { in: ids }, organizationId: orgId },
      select,
    });
  }

  private async buildFallbackActivities(orgId: string) {
    const [projects, taskLogs, movements] = await Promise.all([
      this.prisma.project.findMany({
        where: { organizationId: orgId, isDeleted: false },
        select: { id: true, projectName: true, projectCode: true },
      }),
      this.prisma.taskActivityLog.findMany({
        where: { task: { organizationId: orgId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          activityType: true,
          description: true,
          performedByName: true,
          createdAt: true,
          task: { select: { id: true, title: true } },
        },
      }),
      this.prisma.stockMovement.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          itemName: true,
          type: true,
          quantity: true,
          performedBy: true,
          date: true,
        },
      }),
    ]);

    const projectName = new Map(projects.map((p) => [p.id, p.projectName || p.projectCode]));
    const projectCode = new Map(projects.map((p) => [p.id, p.projectCode]));
    const projectIdList = projects.map((p) => p.id);

    const projectLogs =
      projectIdList.length > 0
        ? await this.prisma.projectActivity.findMany({
            where: { projectId: { in: projectIdList } },
            orderBy: { performedAt: 'desc' },
            take: 10,
            select: {
              id: true,
              type: true,
              description: true,
              performedBy: true,
              performedAt: true,
              projectId: true,
            },
          })
        : [];

    const items: Array<Record<string, unknown>> = [];

    for (const a of projectLogs) {
      items.push({
        id: `activity-${a.id}`,
        entityType: 'project',
        entityId: a.projectId,
        entityName: projectName.get(a.projectId) || a.projectId,
        projectCode: projectCode.get(a.projectId) || '',
        projectName: projectName.get(a.projectId) || '',
        currentStatus: a.type,
        user: a.performedBy || 'System',
        timestamp: a.performedAt,
        clickable: true,
      });
    }
    for (const a of taskLogs) {
      items.push({
        id: `activity-${a.id}`,
        entityType: 'task',
        entityId: a.task.id,
        entityName: a.task.title,
        currentStatus: a.activityType,
        user: a.performedByName || 'System',
        timestamp: a.createdAt,
        clickable: true,
      });
    }
    for (const m of movements) {
      items.push({
        id: `activity-${m.id}`,
        entityType: 'inventory',
        entityId: m.id,
        entityName: m.itemName,
        currentStatus: m.type,
        user: m.performedBy || 'System',
        timestamp: m.date,
        clickable: true,
      });
    }

    items.sort(
      (a, b) => new Date(b.timestamp as Date).getTime() - new Date(a.timestamp as Date).getTime(),
    );
    return items.slice(0, 25);
  }

  // ─── INVENTORY ─────────────────────────────────────────────────────────────

  private async buildInventory(orgId: string) {
    const [valueAgg, counts, byCategory, incoming, outgoing, warehouses, topMovements] =
      await Promise.all([
        this.prisma.inventoryItem.aggregate({
          where: { organizationId: orgId, isDeleted: false },
          _sum: { totalValue: true },
        }),
        this.prisma.inventoryItem.groupBy({
          by: ['status'],
          where: { organizationId: orgId, isDeleted: false },
          _count: { _all: true },
        }),
        this.prisma.inventoryItem.groupBy({
          by: ['category'],
          where: { organizationId: orgId, isDeleted: false },
          _sum: { totalValue: true },
          _count: { _all: true },
        }),
        this.prisma.stockMovement.aggregate({
          where: { organizationId: orgId, type: { in: ['Stock In', 'stockIn'] } },
          _sum: { quantity: true },
        }),
        this.prisma.stockMovement.aggregate({
          where: { organizationId: orgId, type: { in: ['Stock Out', 'stockOut'] } },
          _sum: { quantity: true },
        }),
        this.prisma.warehouse.findMany({
          where: { organizationId: orgId, isDeleted: false },
          select: { id: true, name: true, currentOccupancy: true, capacity: true },
        }),
        this.prisma.stockMovement.findMany({
          where: { organizationId: orgId },
          orderBy: { date: 'desc' },
          take: 10,
          select: {
            id: true,
            itemName: true,
            type: true,
            quantity: true,
            warehouseName: true,
            date: true,
          },
        }),
      ]);

    const statusCounts: Record<string, number> = {};
    for (const s of counts) {
      if (s.status) {
        statusCounts[s.status] = s._count?._all || 0;
      }
    }
    const lowStock = (statusCounts['Low Stock'] || 0) + (statusCounts['Critical'] || 0);
    const outOfStock = statusCounts['Out of Stock'] || 0;

    const byCategoryData = byCategory.map((c) => ({
      name: c.category || 'Uncategorized',
      value: Number(c._sum.totalValue) || 0,
      count: c._count._all,
    }));

    const warehouseValue = await Promise.all(
      warehouses.map(async (w) => {
        const agg = await this.prisma.inventoryItem.aggregate({
          where: { organizationId: orgId, isDeleted: false, warehouseId: w.id },
          _sum: { totalValue: true },
        });
        return {
          id: w.id,
          name: w.name,
          value: Number(agg._sum.totalValue) || 0,
          occupancy: Number(w.currentOccupancy) || 0,
          capacity: Number(w.capacity) || 0,
        };
      }),
    );

    return {
      totalValue: Number(valueAgg._sum.totalValue) || 0,
      items: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      lowStock,
      outOfStock,
      incomingStock: Number(incoming._sum.quantity) || 0,
      outgoingStock: Number(outgoing._sum.quantity) || 0,
      statusCounts,
      byCategory: byCategoryData,
      warehouses: warehouseValue,
      recentMovements: topMovements,
    };
  }

  // ─── PURCHASE ──────────────────────────────────────────────────────────────

  private async buildPurchase(orgId: string, range: ResolvedDateRange) {
    const current = this.createdAtBetween(range, false);

    const [statusCounts, totalPurchaseAgg, vendorSpend, topVendors, countAll] = await Promise.all([
      this.prisma.purchaseOrder.groupBy({
        by: ['status'],
        where: { organizationId: orgId, isDeleted: false },
        _count: { _all: true },
      }),
      this.prisma.purchaseOrder.aggregate({
        where: {
          organizationId: orgId,
          isDeleted: false,
          status: { in: PO_SPEND_STATUSES },
          ...current,
        },
        _sum: { grandTotal: true },
      }),
      this.prisma.purchaseOrder.groupBy({
        by: ['vendorName'],
        where: { organizationId: orgId, isDeleted: false, status: { in: PO_SPEND_STATUSES } },
        _sum: { grandTotal: true },
        orderBy: { _sum: { grandTotal: 'desc' as const } },
        take: 5,
      }),
      this.prisma.purchaseOrder.groupBy({
        by: ['vendorName'],
        where: { organizationId: orgId, isDeleted: false, status: { in: PO_SPEND_STATUSES } },
        _sum: { grandTotal: true },
        orderBy: { _sum: { grandTotal: 'desc' as const } },
        take: 8,
      }),
      this.prisma.purchaseOrder.count({ where: { organizationId: orgId, isDeleted: false } }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of statusCounts) statusMap[s.status] = s._count._all;
    const open =
      (statusMap['PendingApproval'] || 0) +
      (statusMap['Approved'] || 0) +
      (statusMap['Sent'] || 0) +
      (statusMap['PartiallyReceived'] || 0);
    const completed = (statusMap['FullyReceived'] || 0) + (statusMap['Closed'] || 0);
    const cancelled = statusMap['Cancelled'] || 0;

    return {
      total: countAll,
      open,
      completed,
      cancelled,
      totalPurchase: Number(totalPurchaseAgg._sum.grandTotal) || 0,
      vendorSpend: vendorSpend.map((v) => ({
        name: v.vendorName || 'Unknown',
        value: Number(v._sum.grandTotal) || 0,
      })),
      topVendors: topVendors.map((v) => ({
        name: v.vendorName || 'Unknown',
        value: Number(v._sum.grandTotal) || 0,
      })),
      averageOrderValue:
        countAll > 0 ? this.round(Number(totalPurchaseAgg._sum.grandTotal) / countAll) : 0,
    };
  }

  // ─── LEADS ─────────────────────────────────────────────────────────────────

  private async buildLeads(orgId: string, range: ResolvedDateRange) {
    const current = this.createdAtBetween(range, false);
    const convertedCurrent = {
      organizationId: orgId,
      isDeleted: false,
      convertedDate: current.createdAt ?? { gte: new Date(0) },
    };

    const [funnel, convertedCount, lostCount, avgConversionSeconds] = await Promise.all([
      this.groupByCount('lead', 'status', orgId),
      this.prisma.lead.count({ where: convertedCurrent }),
      this.prisma.lead.count({
        where: { organizationId: orgId, isDeleted: false, status: 'Rejected' as LeadStatus },
      }),
      this.prisma.$queryRawUnsafe<Array<{ avg_seconds: number }>>(
        `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM ("convertedDate" - "createdAt"))), 0)::float8 AS avg_seconds
         FROM "Lead"
         WHERE "organizationId" = $1 AND "isDeleted" = false AND "convertedDate" IS NOT NULL`,
        orgId,
      ),
    ]);

    const statusOrder = [
      'New',
      'Contacted',
      'DesignPending',
      'BOQPending',
      'EstimateSent',
      'ProposalSent',
      'Negotiation',
      'Approved',
      'Converted',
      'Rejected',
    ];
    const statusMap = new Map(funnel.map((f) => [f.name, f.value]));
    const orderedFunnel = statusOrder
      .map((s) => ({ name: s, value: statusMap.get(s) || 0 }))
      .filter((f) => f.value > 0);

    return {
      converted: convertedCount,
      lost: lostCount,
      won: convertedCount,
      averageConversionTimeDays: this.round((avgConversionSeconds?.[0]?.avg_seconds || 0) / 86400),
      funnel: orderedFunnel,
    };
  }

  // ─── TASKS ─────────────────────────────────────────────────────────────────

  private async buildTasks(orgId: string, range: ResolvedDateRange, now: Date) {
    const todayStart = this.startOfDay(now);

    const [statusCounts, today, overdue, completed, avgCompletionSeconds] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['status'],
        where: { organizationId: orgId, isDeleted: false },
        _count: { _all: true },
      }),
      this.prisma.task.count({
        where: {
          organizationId: orgId,
          isDeleted: false,
          dueDate: { gte: todayStart, lte: this.endOfDay(now) },
        },
      }),
      this.prisma.task.count({
        where: {
          organizationId: orgId,
          isDeleted: false,
          dueDate: { lt: now },
          status: { in: ['Pending', 'InProgress', 'Reopened', 'Blocked'] },
        },
      }),
      this.prisma.task.count({
        where: {
          organizationId: orgId,
          isDeleted: false,
          status: { in: ['Completed', 'Verified', 'Closed'] },
        },
      }),
      this.prisma.$queryRawUnsafe<Array<{ avg_seconds: number }>>(
        `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt"))), 0)::float8 AS avg_seconds
         FROM "Task"
         WHERE "organizationId" = $1 AND "isDeleted" = false AND "completedAt" IS NOT NULL`,
        orgId,
      ),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of statusCounts) statusMap[s.status] = s._count._all;

    return {
      today,
      overdue,
      completed,
      pending: statusMap['Pending'] || 0,
      inProgress: statusMap['InProgress'] || 0,
      review: statusMap['Review'] || 0,
      rejected: statusMap['Rejected'] || 0,
      cancelled: statusMap['Cancelled'] || 0,
      averageCompletionDays: this.round((avgCompletionSeconds?.[0]?.avg_seconds || 0) / 86400),
      byStatus: statusCounts.map((s) => ({ name: s.status, value: s._count._all })),
    };
  }

  // ─── GANTT ─────────────────────────────────────────────────────────────────

  async getGantt(dto: GetDashboardDto, organizationId: string) {
    const orgId = this.orgScoped(organizationId);
    const where: Record<string, unknown> = { organizationId: orgId, isDeleted: false };
    if (dto.projectId) where.id = dto.projectId;

    const projects = await this.prisma.project.findMany({
      where,
      select: {
        id: true,
        projectId: true,
        projectCode: true,
        projectName: true,
        customerName: true,
        projectType: true,
        status: true,
        stage: true,
        progress: true,
        startDate: true,
        endDate: true,
        healthStatus: true,
        projectManager: true,
        projectManagerId: true,
        priority: true,
        createdAt: true,
        milestones: {
          select: {
            id: true,
            name: true,
            plannedDate: true,
            actualDate: true,
            status: true,
          },
          orderBy: { plannedDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const projectIds = projects.map((p) => p.id);
    const linkedTasks = await this.prisma.task.findMany({
      where: {
        organizationId: orgId,
        isDeleted: false,
        projectId: { in: projectIds.length > 0 ? projectIds : ['__none__'] },
      },
      select: {
        id: true,
        taskId: true,
        title: true,
        description: true,
        startDate: true,
        dueDate: true,
        estimatedHours: true,
        timeSpent: true,
        progress: true,
        priority: true,
        status: true,
        category: true,
        assignedUserName: true,
        assignedUserId: true,
        projectId: true,
        completedAt: true,
      },
      orderBy: { startDate: 'asc' },
    });

    const taskDeps = await this.prisma.taskDependency.findMany({
      where: {
        task: {
          organizationId: orgId,
          projectId: { in: projectIds.length > 0 ? projectIds : ['__none__'] },
        },
      },
      select: { taskId: true, dependsOnTaskId: true },
    });

    const depMap = new Map<string, string[]>();
    for (const d of taskDeps) {
      const list = depMap.get(d.taskId) || [];
      list.push(d.dependsOnTaskId);
      depMap.set(d.taskId, list);
    }

    const now = new Date();
    const phaseOrder = [
      'Design',
      'Procurement',
      'Fabrication',
      'Dispatch',
      'Installation',
      'Handover',
    ];

    const result = projects.map((p) => {
      const pt = linkedTasks.filter((t) => t.projectId === p.id);
      const phases: Array<Record<string, unknown>> = [];
      for (const phase of phaseOrder) {
        const tasksInPhase = pt.filter(
          (t) => this.phaseForTask(t.category, p.stage ?? null) === phase,
        );
        const phaseTasks = tasksInPhase.map((t) => {
          const start = t.startDate || p.startDate || t.dueDate || p.createdAt || now;
          const end = t.dueDate || p.endDate || start;
          const delay = this.delayDays(t.dueDate, now, t.status);
          const durationDays = Math.max(
            1,
            Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1,
          );
          return {
            id: t.id,
            taskId: t.taskId,
            name: t.title,
            description: t.description,
            projectId: p.id,
            project: p.projectName,
            startDate: start,
            endDate: end,
            duration: durationDays,
            progress: t.progress,
            owner: t.assignedUserName || t.assignedUserId,
            priority: t.priority,
            status: t.status,
            dependencies: depMap.get(t.id) || [],
            estimatedHours: t.estimatedHours,
            workedHours: t.timeSpent,
            delay: delay.days,
            slack: delay.slack,
            actualStart: t.completedAt,
            color: this.taskColor(t.status, t.priority),
          };
        });

        if (phaseTasks.length > 0) {
          const starts = phaseTasks.map((t) => new Date(t.startDate as Date).getTime());
          const ends = phaseTasks.map((t) => new Date(t.endDate as Date).getTime());
          phases.push({
            id: `phase-${p.id}-${phase}`,
            name: phase,
            startDate: new Date(Math.min(...starts)),
            endDate: new Date(Math.max(...ends)),
            progress: Math.round(
              phaseTasks.reduce((a, t) => a + (t.progress as number), 0) / phaseTasks.length,
            ),
            tasks: phaseTasks,
          });
        }
      }

      const pStart = p.startDate || now;
      const pEnd = p.endDate || pStart;
      return {
        id: p.id,
        projectId: p.projectId,
        projectCode: p.projectCode,
        projectName: p.projectName,
        customerName: p.customerName,
        projectType: p.projectType,
        status: p.status,
        stage: p.stage,
        progress: p.progress,
        startDate: p.startDate,
        endDate: p.endDate,
        healthStatus: p.healthStatus,
        manager: p.projectManager,
        managerId: p.projectManagerId,
        priority: p.priority,
        createdAt: p.createdAt,
        milestones: p.milestones.map((m) => ({
          id: m.id,
          name: m.name,
          plannedDate: m.plannedDate,
          actualDate: m.actualDate,
          status: m.status,
        })),
        phases,
        totalTasks: pt.length,
        duration: Math.max(
          1,
          Math.ceil((new Date(pEnd).getTime() - new Date(pStart).getTime()) / 86400000) + 1,
        ),
      };
    });

    const allStarts = result
      .flatMap((p) => [
        p.startDate,
        ...p.phases.flatMap((ph) => [
          ph.startDate,
          ...(ph.tasks as Array<Record<string, unknown>>).map((t) => t.startDate),
        ]),
      ])
      .filter(Boolean) as Date[];
    const allEnds = result
      .flatMap((p) => [
        p.endDate,
        ...p.phases.flatMap((ph) => [
          ph.endDate,
          ...(ph.tasks as Array<Record<string, unknown>>).map((t) => t.endDate),
        ]),
      ])
      .filter(Boolean) as Date[];

    return {
      projects: result,
      totalProjects: result.length,
      totalTasks: result.reduce((a, p) => a + (p.totalTasks as number), 0),
      startDate:
        allStarts.length > 0 ? new Date(Math.min(...allStarts.map((d) => d.getTime()))) : null,
      endDate: allEnds.length > 0 ? new Date(Math.max(...allEnds.map((d) => d.getTime()))) : null,
    };
  }

  private phaseForTask(category: string | null, projectStage: string | null): string {
    if (category) {
      const mapped = CATEGORY_TO_PHASE[category];
      if (mapped) return mapped;
    }
    if (projectStage && STAGE_TO_PHASE[projectStage]) {
      return STAGE_TO_PHASE[projectStage];
    }
    return 'Design';
  }

  private delayDays(dueDate: Date | null, now: Date, status: string) {
    if (!dueDate) return { days: 0, slack: 0 };
    const diff = Math.round((new Date(dueDate).getTime() - now.getTime()) / 86400000);
    const active = ['Pending', 'InProgress', 'Reopened', 'Blocked'].includes(status);
    if (diff < 0 && active) return { days: Math.abs(diff), slack: 0 };
    return { days: 0, slack: Math.max(0, diff) };
  }

  private taskColor(status: string, priority: string): string {
    if (status === 'Completed' || status === 'Verified' || status === 'Closed')
      return 'bg-emerald-500';
    if (status === 'Blocked') return 'bg-rose-500';
    if (priority === 'Critical') return 'bg-rose-400';
    if (priority === 'High') return 'bg-amber-400';
    if (status === 'InProgress') return 'bg-blue-400';
    return 'bg-slate-400';
  }

  private projectColor(health: string | null): string {
    if (health === 'Critical') return 'bg-rose-500';
    if (health === 'At Risk') return 'bg-amber-500';
    if (health === 'Healthy') return 'bg-emerald-500';
    return 'bg-slate-400';
  }

  private startOfDay(d: Date): Date {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private endOfDay(d: Date): Date {
    const copy = new Date(d);
    copy.setHours(23, 59, 59, 999);
    return copy;
  }
}
