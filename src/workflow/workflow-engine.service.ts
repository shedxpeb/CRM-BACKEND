import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../auth/services/audit.service';
import {
  TimelineCard,
  entityLabel,
  formatDisplayCode,
  humanizeEventTitle,
  isNoiseAction,
  sanitizeDetails,
  looksLikeUuid,
} from './timeline.helpers';

@Injectable()
export class WorkflowEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Process a business event — automates status transitions.
   * Every business operation (create, update, approve, etc.) calls this.
   * The engine finds matching EventRule → auto-transitions status.
   */
  async processEvent(params: {
    organizationId?: string;
    entityType: string;
    entityId: string;
    eventType: string;
    data?: any;
    createdById?: string;
  }) {
    const { organizationId, entityType, entityId, eventType, data, createdById } = params;

    if (!organizationId) return { eventRecorded: false, statusChanged: false };

    // 1. Record the raw event
    await this.prisma.businessEvent.create({
      data: { organizationId, entityType, entityId, eventType, data, createdById },
    });

    // 2. Auto-audit: every event is audited
    await this.auditService.log({
      action: `${entityType}.${eventType}`,
      organizationId,
      userId: createdById,
      resource: entityType,
      resourceId: entityId,
      metadata: data,
    });

    // 3. Find matching event rule
    const rule = await this.prisma.eventRule.findFirst({
      where: {
        organizationId,
        entityType,
        eventType,
        isActive: true,
      },
    });

    if (!rule) {
      return { eventRecorded: true, statusChanged: false };
    }

    // 4. Get current status
    const latestHistory = await this.prisma.statusHistory.findFirst({
      where: { organizationId, entityType, entityId },
      orderBy: { changedAt: 'desc' },
    });
    const currentStatus = latestHistory?.toStatus || null;

    // 5. Check if transition is allowed (fromStatus null = any)
    if (rule.fromStatus && rule.fromStatus !== currentStatus) {
      return { eventRecorded: true, statusChanged: false, reason: 'fromStatus mismatch' };
    }

    // 6. Apply status transition
    const history = await this.prisma.statusHistory.create({
      data: {
        organizationId,
        entityType,
        entityId,
        fromStatus: currentStatus,
        toStatus: rule.toStatus,
        changedById: createdById,
        reason: `Auto: ${eventType}`,
        metadata: { eventType, ruleId: rule.id, ...(data || {}) },
      },
    });

    return {
      eventRecorded: true,
      statusChanged: true,
      from: currentStatus,
      to: rule.toStatus,
      history,
    };
  }

  /**
   * Enterprise activity timeline — one business card per action.
   * No database IDs, raw event names, or JSON dumped to clients.
   */
  async getEventTimeline(
    entityType: string,
    entityId: string,
    organizationId: string,
  ): Promise<TimelineCard[]> {
    const [events, statusChanges, audits, entityContext] = await Promise.all([
      this.prisma.businessEvent.findMany({
        where: { entityType, entityId, organizationId },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.statusHistory.findMany({
        where: { entityType, entityId, organizationId },
        orderBy: { changedAt: 'desc' },
        take: 200,
      }),
      this.prisma.auditLog.findMany({
        where: { resource: entityType, resourceId: entityId, organizationId },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.loadEntityContext(entityType, entityId, organizationId),
    ]);

    const userIds = new Set<string>();
    for (const sc of statusChanges) if (sc.changedById) userIds.add(sc.changedById);
    for (const ev of events) if (ev.createdById) userIds.add(ev.createdById);
    for (const log of audits) if (log.userId) userIds.add(log.userId);

    const users = userIds.size
      ? await this.prisma.user.findMany({
          where: { id: { in: [...userIds] } },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            designation: true,
          },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    type Raw = {
      key: string;
      timestamp: Date;
      userId?: string | null;
      source: 'status' | 'event' | 'audit';
      action: string;
      fromStatus?: string | null;
      toStatus?: string | null;
      reason?: string | null;
      data?: Record<string, unknown> | null;
    };

    const raws: Raw[] = [];

    for (const sc of statusChanges) {
      raws.push({
        key: `status:${sc.id}`,
        timestamp: sc.changedAt,
        userId: sc.changedById,
        source: 'status',
        action: 'manual.status-change',
        fromStatus: sc.fromStatus,
        toStatus: sc.toStatus,
        reason: sc.reason?.startsWith('Auto:') ? null : sc.reason,
        data: (sc.metadata as Record<string, unknown>) || null,
      });
    }

    for (const ev of events) {
      if (isNoiseAction(ev.eventType)) continue;
      raws.push({
        key: `event:${ev.id}`,
        timestamp: ev.createdAt,
        userId: ev.createdById,
        source: 'event',
        action: ev.eventType,
        data: (ev.data as Record<string, unknown>) || null,
        toStatus: (ev.data as any)?.toStatus,
        fromStatus: (ev.data as any)?.fromStatus,
        reason: (ev.data as any)?.reason,
      });
    }

    for (const log of audits) {
      if (isNoiseAction(log.action)) continue;
      const meta =
        log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
          ? (log.metadata as Record<string, unknown>)
          : null;
      raws.push({
        key: `audit:${log.id}`,
        timestamp: log.createdAt,
        userId: log.userId,
        source: 'audit',
        action: log.action,
        data: meta,
        toStatus: meta?.toStatus as string | undefined,
        fromStatus: meta?.fromStatus as string | undefined,
        reason: typeof meta?.reason === 'string' ? meta.reason : null,
      });
    }

    // Merge near-duplicate sources of the SAME business action into one card
    raws.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const merged: Raw[] = [];
    const consumed = new Set<string>();

    for (const item of raws) {
      if (consumed.has(item.key)) continue;

      const cluster = [item];
      consumed.add(item.key);

      for (const other of raws) {
        if (consumed.has(other.key)) continue;
        const sameUser = !item.userId || !other.userId || item.userId === other.userId;
        const closeInTime = Math.abs(item.timestamp.getTime() - other.timestamp.getTime()) < 3000;
        const sameStatusTransition =
          item.toStatus && other.toStatus && item.toStatus === other.toStatus;
        const bothStatusLike =
          (item.source === 'status' || /status/i.test(item.action)) &&
          (other.source === 'status' ||
            /status/i.test(other.action) ||
            other.source === 'event' ||
            other.source === 'audit');
        const bothCreateLike = /created$/i.test(item.action) && /created$/i.test(other.action);
        const bothUpdateLike = /updated$/i.test(item.action) && /updated$/i.test(other.action);

        if (
          sameUser &&
          closeInTime &&
          (sameStatusTransition ||
            bothStatusLike ||
            bothCreateLike ||
            bothUpdateLike ||
            item.action === other.action)
        ) {
          cluster.push(other);
          consumed.add(other.key);
        }
      }

      const primary =
        cluster.find((c) => c.source === 'status') ||
        cluster.find((c) => c.source === 'event') ||
        cluster[0];

      const fromStatus = cluster.find((c) => c.fromStatus)?.fromStatus ?? primary.fromStatus;
      const toStatus = cluster.find((c) => c.toStatus)?.toStatus ?? primary.toStatus;
      const reason = cluster.find((c) => c.reason)?.reason ?? primary.reason;
      const data = Object.assign({}, ...cluster.map((c) => c.data || {}));

      merged.push({
        ...primary,
        fromStatus,
        toStatus,
        reason,
        data,
      });
    }

    const cards: TimelineCard[] = merged.map((item) => {
      const user = item.userId ? userMap.get(item.userId) : null;
      const performedBy = user?.name || (user?.email ? user.email.split('@')[0] : null) || null;
      const safePerformedBy = performedBy && !looksLikeUuid(performedBy) ? performedBy : 'System';

      const title = humanizeEventTitle(entityType, item.action);
      const isStatus = !!item.toStatus || /status/i.test(item.action) || item.source === 'status';

      let description = '';
      if (isStatus && item.toStatus) {
        description = item.fromStatus
          ? `${item.fromStatus} → ${item.toStatus}`
          : `Status set to ${item.toStatus}`;
      } else if (item.reason) {
        description = item.reason;
      } else if (/created/i.test(item.action)) {
        description = entityContext.summary || `${entityLabel(entityType)} record was created`;
      } else if (/updated/i.test(item.action)) {
        description = `${entityLabel(entityType)} information was updated`;
      } else {
        description = `${entityLabel(entityType)} activity recorded`;
      }

      const detailSource: Record<string, unknown> = {
        ...(item.data || {}),
      };
      if (item.fromStatus) detailSource.fromStatus = item.fromStatus;
      if (item.toStatus) detailSource.toStatus = item.toStatus;
      if (item.reason) detailSource.reason = item.reason;

      let type: TimelineCard['type'] = 'activity';
      if (isStatus) type = 'status_change';
      else if (/created/i.test(item.action)) type = 'created';
      else if (/updated/i.test(item.action)) type = 'updated';
      else if (/comment/i.test(item.action)) type = 'comment';
      else if (/attachment/i.test(item.action)) type = 'attachment';
      else if (/approval/i.test(item.action)) type = 'approval';

      return {
        id: item.key,
        type,
        title,
        description,
        timestamp: item.timestamp.toISOString(),
        performedBy: safePerformedBy,
        performedByRole: user?.designation || user?.role || null,
        department: user?.department || null,
        fromStatus: item.fromStatus || null,
        toStatus: item.toStatus || null,
        reason: item.reason || null,
        details: sanitizeDetails(detailSource),
        relatedRecords: entityContext.relatedRecords,
        displayCode: entityContext.displayCode,
        entityLabel: entityLabel(entityType),
      };
    });

    return cards;
  }

  private async loadEntityContext(entityType: string, entityId: string, organizationId: string) {
    const relatedRecords: { label: string; value: string; code?: string | null }[] = [];
    let displayCode: string | null = null;
    let summary = '';

    try {
      if (entityType === 'customer') {
        const c = await this.prisma.customer.findFirst({ where: { id: entityId, organizationId } });
        if (c) {
          displayCode = formatDisplayCode('customer', c.customerId);
          summary = `${c.customerName}${c.companyName ? ` · ${c.companyName}` : ''}`;
          relatedRecords.push({ label: 'Customer', value: c.customerName, code: displayCode });
          if (c.companyName) relatedRecords.push({ label: 'Company', value: c.companyName });
        }
      } else if (entityType === 'lead') {
        const l = await this.prisma.lead.findFirst({ where: { id: entityId, organizationId } });
        if (l) {
          displayCode = formatDisplayCode('lead', l.leadNumber);
          summary = `${l.customerName}${l.companyName ? ` · ${l.companyName}` : ''}`;
          relatedRecords.push({ label: 'Lead', value: l.customerName, code: displayCode });
          if (l.companyName) relatedRecords.push({ label: 'Company', value: l.companyName });
          if (l.projectTitle) relatedRecords.push({ label: 'Project', value: l.projectTitle });
        }
      } else if (entityType === 'project') {
        const p = await this.prisma.project.findFirst({ where: { id: entityId, organizationId } });
        if (p) {
          displayCode = formatDisplayCode('project', null, p.projectCode);
          summary = p.projectName;
          relatedRecords.push({ label: 'Project', value: p.projectName, code: displayCode });
          if (p.customerName) relatedRecords.push({ label: 'Customer', value: p.customerName });
        }
      }
    } catch {
      // entity may not exist for this type
    }

    return { displayCode, summary, relatedRecords };
  }
}
