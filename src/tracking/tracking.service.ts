import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../auth/services/audit.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';

const DEFAULT_PIPELINES: Record<
  string,
  Array<{
    status: string;
    label: string;
    order: number;
    isInitial?: boolean;
    isFinal?: boolean;
    color?: string;
    allowedTransitions?: string[];
  }>
> = {
  lead: [
    {
      status: 'New',
      label: 'New',
      order: 1,
      isInitial: true,
      color: '#6366f1',
      allowedTransitions: ['Contacted', 'Rejected'],
    },
    {
      status: 'Contacted',
      label: 'Contacted',
      order: 2,
      color: '#3b82f6',
      allowedTransitions: ['DesignPending', 'Rejected'],
    },
    {
      status: 'DesignPending',
      label: 'Design Pending',
      order: 3,
      color: '#0ea5e9',
      allowedTransitions: ['BOQPending', 'Rejected'],
    },
    {
      status: 'BOQPending',
      label: 'BOQ Pending',
      order: 4,
      color: '#14b8a6',
      allowedTransitions: ['EstimateSent', 'Rejected'],
    },
    {
      status: 'EstimateSent',
      label: 'Estimate Sent',
      order: 5,
      color: '#22c55e',
      allowedTransitions: ['ProposalSent', 'Negotiation', 'Rejected'],
    },
    {
      status: 'ProposalSent',
      label: 'Proposal Sent',
      order: 6,
      color: '#84cc16',
      allowedTransitions: ['Negotiation', 'Approved', 'Rejected'],
    },
    {
      status: 'Negotiation',
      label: 'Negotiation',
      order: 7,
      color: '#eab308',
      allowedTransitions: ['Approved', 'Rejected', 'ProposalSent'],
    },
    {
      status: 'Approved',
      label: 'Approved',
      order: 8,
      color: '#16a34a',
      allowedTransitions: ['Converted'],
    },
    {
      status: 'Rejected',
      label: 'Rejected',
      order: 9,
      isFinal: true,
      color: '#ef4444',
      allowedTransitions: ['New', 'Contacted'],
    },
    {
      status: 'Converted',
      label: 'Converted',
      order: 10,
      isFinal: true,
      color: '#059669',
      allowedTransitions: [],
    },
  ],
  customer: [
    { status: 'Prospect', label: 'Prospect', order: 1, isInitial: true, color: '#6366f1' },
    { status: 'Active', label: 'Active', order: 2, color: '#22c55e' },
    { status: 'Inactive', label: 'Inactive', order: 3, isFinal: true, color: '#94a3b8' },
  ],
  project: [
    { status: 'Lead', label: 'Lead', order: 1, isInitial: true, color: '#6366f1' },
    { status: 'Active', label: 'Active', order: 2, color: '#22c55e' },
    { status: 'OnHold', label: 'On Hold', order: 3, color: '#eab308' },
    { status: 'Completed', label: 'Completed', order: 4, isFinal: true, color: '#059669' },
    { status: 'Cancelled', label: 'Cancelled', order: 5, isFinal: true, color: '#ef4444' },
  ],
  'purchase-order': [
    { status: 'Draft', label: 'Draft', order: 1, isInitial: true, color: '#6366f1' },
    { status: 'PendingApproval', label: 'Pending Approval', order: 2, color: '#eab308' },
    { status: 'Approved', label: 'Approved', order: 3, color: '#22c55e' },
    { status: 'Sent', label: 'Sent', order: 4, color: '#3b82f6' },
    { status: 'PartiallyReceived', label: 'Partially Received', order: 5, color: '#f97316' },
    { status: 'FullyReceived', label: 'Fully Received', order: 6, color: '#10b981' },
    { status: 'Closed', label: 'Closed', order: 7, isFinal: true, color: '#059669' },
    { status: 'Rejected', label: 'Rejected', order: 8, isFinal: true, color: '#ef4444' },
    { status: 'Cancelled', label: 'Cancelled', order: 9, isFinal: true, color: '#94a3b8' },
  ],
};

function normalizeStatus(value: string | null | undefined): string {
  return String(value || '')
    .replace(/[\s_-]+/g, '')
    .toLowerCase();
}

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  // ─── UNIFIED TRACKING DATA ─────────────────────────────

  async getTrackingData(entityType: string, entityId: string, organizationId: string) {
    const pipeline = await this.ensurePipeline(entityType, organizationId);
    const [currentStatus, comments, attachments, approvals, eventTimeline] = await Promise.all([
      this.getCurrentStatus(entityType, entityId, organizationId),
      this.getComments(entityType, entityId, organizationId),
      this.getAttachments(entityType, entityId, organizationId),
      this.getApprovals(entityType, entityId, organizationId),
      this.workflowEngine.getEventTimeline(entityType, entityId, organizationId),
    ]);

    const currentIndex = this.findStageIndex(pipeline, currentStatus);
    const currentStep = currentIndex >= 0 ? pipeline[currentIndex] : null;
    const progress =
      pipeline.length > 0 && currentIndex >= 0
        ? Math.round(((currentIndex + 1) / pipeline.length) * 100)
        : 0;

    const stageDetails = currentStep
      ? await this.loadStageDetails(entityType, entityId, currentStep.status, organizationId)
      : await this.loadStageDetails(
          entityType,
          entityId,
          currentStatus || 'Unknown',
          organizationId,
        );

    const mappedPipeline = pipeline.map((s, idx) =>
      this.mapStage(s, currentStatus, currentIndex, idx),
    );

    return {
      currentStatus,
      currentStage: currentStep
        ? this.mapStage(currentStep, currentStatus, currentIndex, currentIndex)
        : null,
      allowedTransitions: this.resolveTransitions(currentStep, pipeline),
      pipeline: mappedPipeline,
      progress,
      stageDetails,
      timeline: eventTimeline,
      comments,
      attachments,
      approvals,
    };
  }

  // ─── DYNAMIC STAGE DETAILS ─────────────────────────────

  private async loadStageDetails(
    entityType: string,
    entityId: string,
    stage: string,
    organizationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitizeEntity = (entity: Record<string, any> | null) => {
      if (!entity) return { stage, title: stage, fields: {} };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fields: Record<string, any> = {};
      for (const [key, value] of Object.entries(entity)) {
        if (
          key === 'id' ||
          key.endsWith('Id') ||
          key.endsWith('Ids') ||
          [
            'organizationId',
            'customFields',
            'password',
            'token',
            'isDeleted',
            'deletedAt',
            'attachments',
          ].includes(key)
        ) {
          continue;
        }
        if (value === null || value === undefined) continue;
        if (typeof value === 'object' && !(value instanceof Date)) continue;
        if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(value)) continue;
        fields[key] = value;
      }
      return { stage, title: stage, fields };
    };

    switch (entityType) {
      case 'lead': {
        const lead = await this.prisma.lead.findFirst({
          where: { id: entityId, organizationId, isDeleted: false },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return sanitizeEntity(lead as any);
      }
      case 'customer': {
        const customer = await this.prisma.customer.findFirst({
          where: { id: entityId, organizationId, isDeleted: false },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return sanitizeEntity(customer as any);
      }
      case 'project': {
        const project = await this.prisma.project.findFirst({
          where: { id: entityId, organizationId, isDeleted: false },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return sanitizeEntity(project as any);
      }
      case 'purchase-order': {
        const po = await this.prisma.purchaseOrder.findFirst({
          where: { id: entityId, organizationId, isDeleted: false },
          include: { items: true },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return sanitizeEntity(po as any);
      }
      default:
        return { stage, title: stage, fields: {} };
    }
  }

  // ─── STATUS CHANGE (UPDATES ENTITY + HISTORY) ──────────

  async changeStatus(
    entityType: string,
    entityId: string,
    toStatus: string,
    organizationId: string,
    changedById?: string,
    reason?: string,
  ) {
    const pipeline = await this.ensurePipeline(entityType, organizationId);
    const targetIndex = this.findStageIndex(pipeline, toStatus);
    if (targetIndex < 0) {
      throw new BadRequestException(`Status "${toStatus}" is not in the ${entityType} pipeline`);
    }
    const target = pipeline[targetIndex];
    const canonicalStatus = target.status;

    const fromStatus = await this.getCurrentStatus(entityType, entityId, organizationId);
    if (normalizeStatus(fromStatus) === normalizeStatus(canonicalStatus)) {
      return this.getTrackingData(entityType, entityId, organizationId);
    }

    const currentIndex = this.findStageIndex(pipeline, fromStatus);
    const currentStep = currentIndex >= 0 ? pipeline[currentIndex] : null;
    const allowed = this.resolveTransitions(currentStep, pipeline);
    if (
      allowed.length > 0 &&
      !allowed.some((a) => normalizeStatus(a) === normalizeStatus(canonicalStatus))
    ) {
      throw new BadRequestException(
        `Cannot move from "${fromStatus || 'unset'}" to "${canonicalStatus}". Allowed: ${allowed.join(', ')}`,
      );
    }

    await this.updateEntityStatus(entityType, entityId, organizationId, canonicalStatus);

    await this.prisma.statusHistory.create({
      data: {
        organizationId,
        entityType,
        entityId,
        fromStatus: fromStatus || null,
        toStatus: canonicalStatus,
        changedById,
        reason: reason || 'Manual status change',
        metadata: { source: 'tracking' },
      },
    });

    await this.workflowEngine.processEvent({
      organizationId,
      entityType,
      entityId,
      eventType: 'status.changed',
      data: { fromStatus, toStatus: canonicalStatus, reason },
      createdById: changedById,
    });

    return this.getTrackingData(entityType, entityId, organizationId);
  }

  // ─── TIMELINE ────────────────────────────────────────

  async getTimeline(entityType: string, entityId: string, organizationId: string) {
    return this.workflowEngine.getEventTimeline(entityType, entityId, organizationId);
  }

  // ─── STATUS PIPELINE ─────────────────────────────────

  async getPipeline(entityType: string, organizationId: string) {
    return this.ensurePipeline(entityType, organizationId);
  }

  private async ensurePipeline(entityType: string, organizationId: string) {
    const existing = await this.prisma.statusPipeline.findMany({
      where: { entityType, organizationId, isActive: true },
      orderBy: { order: 'asc' },
    });
    if (existing.length > 0) return existing;

    const defaults = DEFAULT_PIPELINES[entityType];
    if (!defaults?.length) return [];

    await this.prisma.statusPipeline.createMany({
      data: defaults.map((d) => ({
        organizationId,
        entityType,
        status: d.status,
        label: d.label,
        order: d.order,
        color: d.color,
        isInitial: !!d.isInitial,
        isFinal: !!d.isFinal,
        isActive: true,
        allowedTransitions: d.allowedTransitions || [],
      })),
      skipDuplicates: true,
    });

    return this.prisma.statusPipeline.findMany({
      where: { entityType, organizationId, isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  private async getCurrentStatus(entityType: string, entityId: string, organizationId: string) {
    const latest = await this.prisma.statusHistory.findFirst({
      where: { entityType, entityId, organizationId },
      orderBy: { changedAt: 'desc' },
    });
    if (latest?.toStatus) return latest.toStatus;

    // Fall back to live entity status — critical so UI never shows "No stage set" for real records
    return this.getEntityStatus(entityType, entityId, organizationId);
  }

  private async getEntityStatus(
    entityType: string,
    entityId: string,
    organizationId: string,
  ): Promise<string | null> {
    switch (entityType) {
      case 'lead': {
        const lead = await this.prisma.lead.findFirst({
          where: { id: entityId, organizationId, isDeleted: false },
          select: { status: true },
        });
        return lead?.status || null;
      }
      case 'customer': {
        const customer = await this.prisma.customer.findFirst({
          where: { id: entityId, organizationId, isDeleted: false },
          select: { status: true },
        });
        return customer?.status || null;
      }
      case 'project': {
        const project = await this.prisma.project.findFirst({
          where: { id: entityId, organizationId, isDeleted: false },
          select: { status: true, stage: true },
        });
        return project?.status || project?.stage || null;
      }
      default:
        return null;
    }
  }

  private async updateEntityStatus(
    entityType: string,
    entityId: string,
    organizationId: string,
    status: string,
  ) {
    switch (entityType) {
      case 'lead': {
        const lead = await this.prisma.lead.findFirst({
          where: { id: entityId, organizationId, isDeleted: false },
        });
        if (!lead) throw new NotFoundException('Lead not found');
        await this.prisma.lead.update({
          where: { id: entityId },
          data: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            status: this.toEntityStatus('lead', status) as any,
            ...(normalizeStatus(status) === 'converted'
              ? { isConverted: true, convertedDate: new Date() }
              : {}),
          },
        });
        return;
      }
      case 'customer': {
        const customer = await this.prisma.customer.findFirst({
          where: { id: entityId, organizationId, isDeleted: false },
        });
        if (!customer) throw new NotFoundException('Customer not found');
        await this.prisma.customer.update({
          where: { id: entityId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { status: status as any },
        });
        return;
      }
      case 'project': {
        const project = await this.prisma.project.findFirst({
          where: { id: entityId, organizationId, isDeleted: false },
        });
        if (!project) throw new NotFoundException('Project not found');
        await this.prisma.project.update({ where: { id: entityId }, data: { status } });
        return;
      }
      case 'purchase-order': {
        const po = await this.prisma.purchaseOrder.findFirst({
          where: { id: entityId, organizationId, isDeleted: false },
        });
        if (!po) throw new NotFoundException('Purchase Order not found');
        await this.prisma.purchaseOrder.update({
          where: { id: entityId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { status: status as any },
        });
        return;
      }
      default:
        throw new BadRequestException(`Status updates are not supported for ${entityType}`);
    }
  }

  async getStatus(entityType: string, entityId: string, organizationId: string) {
    const data = await this.getTrackingData(entityType, entityId, organizationId);
    return {
      currentStatus: data.currentStatus,
      allowedTransitions: data.allowedTransitions,
      pipeline: data.pipeline,
      timeline: data.timeline,
    };
  }

  // ─── COMMENTS ────────────────────────────────────────

  async getComments(entityType: string, entityId: string, organizationId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { entityType, entityId, organizationId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });

    const authorIds = [...new Set(comments.map((c) => c.authorId).filter(Boolean))];
    const users = authorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, name: true, email: true, designation: true, department: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return comments.map((c) => {
      const user = userMap.get(c.authorId);
      const authorName =
        user?.name || (user?.email ? user.email.split('@')[0] : null) || 'Team Member';
      return {
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        parentId: c.parentId,
        authorName,
        authorRole: user?.designation || null,
        department: user?.department || null,
        authorId: c.authorId,
      };
    });
  }

  async addComment(
    entityType: string,
    entityId: string,
    content: string,
    organizationId: string,
    authorId: string,
    parentId?: string,
  ) {
    if (parentId) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: parentId, organizationId },
      });
      if (!parent) throw new NotFoundException('Parent comment not found');
    }
    const comment = await this.prisma.comment.create({
      data: { organizationId, entityType, entityId, content, authorId, parentId },
    });
    await this.workflowEngine.processEvent({
      organizationId,
      entityType,
      entityId,
      eventType: 'comment.added',
      data: { commentId: comment.id },
      createdById: authorId,
    });
    return comment;
  }

  async deleteComment(commentId: string, organizationId: string, userId: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, organizationId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId)
      throw new BadRequestException('Only the author can delete this comment');
    return this.prisma.comment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });
  }

  // ─── ATTACHMENTS ─────────────────────────────────────

  async getAttachments(entityType: string, entityId: string, organizationId: string) {
    return this.prisma.attachment.findMany({
      where: { entityType, entityId, organizationId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addAttachment(
    entityType: string,
    entityId: string,
    data: {
      fileName: string;
      originalName: string;
      mimeType: string;
      size: number;
      url: string;
      category?: string;
    },
    organizationId: string,
    uploadedById?: string,
  ) {
    const attachment = await this.prisma.attachment.create({
      data: { ...data, organizationId, entityType, entityId, uploadedById },
    });
    await this.workflowEngine.processEvent({
      organizationId,
      entityType,
      entityId,
      eventType: 'attachment.added',
      data: { attachmentId: attachment.id, fileName: data.fileName },
      createdById: uploadedById,
    });
    return attachment;
  }

  async deleteAttachment(attachmentId: string, organizationId: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, organizationId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return this.prisma.attachment.update({
      where: { id: attachmentId },
      data: { isDeleted: true },
    });
  }

  // ─── APPROVALS ──────────────────────────────────────

  async getApprovals(entityType: string, entityId: string, organizationId: string) {
    return this.prisma.approvalRequest.findMany({
      where: { entityType, entityId, organizationId },
      orderBy: { level: 'asc' },
    });
  }

  async requestApproval(
    entityType: string,
    entityId: string,
    approverId: string,
    organizationId: string,
    requestedById: string,
    level = 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any,
  ) {
    const approval = await this.prisma.approvalRequest.create({
      data: { organizationId, entityType, entityId, approverId, requestedById, level, metadata },
    });
    await this.workflowEngine.processEvent({
      organizationId,
      entityType,
      entityId,
      eventType: 'approval.requested',
      data: { approvalId: approval.id, approverId, level },
      createdById: requestedById,
    });
    return approval;
  }

  async respondToApproval(
    approvalId: string,
    status: 'Approved' | 'Rejected',
    organizationId: string,
    actorUserId: string,
    comment?: string,
  ) {
    const approval = await this.prisma.approvalRequest.findFirst({
      where: { id: approvalId, organizationId },
    });
    if (!approval) throw new NotFoundException('Approval request not found');
    if (approval.status !== 'Pending') throw new BadRequestException('Approval already responded');
    if (approval.approverId !== actorUserId) {
      throw new ForbiddenException('Only the assigned approver can respond');
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id: approvalId },
      data: { status, comment, respondedAt: new Date() },
    });

    await this.workflowEngine.processEvent({
      organizationId,
      entityType: approval.entityType,
      entityId: approval.entityId,
      eventType: `approval.${status.toLowerCase()}`,
      data: { approvalId, comment },
    });

    return updated;
  }

  // ─── NOTIFICATIONS ───────────────────────────────────

  async getNotifications(userId: string, organizationId: string, unreadOnly = false) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId, organizationId };
    if (unreadOnly) where.isRead = false;
    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createNotification(data: {
    userId: string;
    organizationId: string;
    title: string;
    message: string;
    type?: string;
    entityType?: string;
    entityId?: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  async markNotificationRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllNotificationsRead(userId: string, organizationId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, organizationId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // ─── HELPERS ─────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private findStageIndex(pipeline: any[], status: string | null): number {
    if (!status) return -1;
    const n = normalizeStatus(status);
    return pipeline.findIndex(
      (s) => normalizeStatus(s.status) === n || normalizeStatus(s.label) === n,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveTransitions(currentStep: any | null, pipeline: any[]): string[] {
    if (!currentStep) {
      // No history yet — allow moving to any non-final initial/next stages, prefer first pipeline step transitions
      const initial = pipeline.find((s) => s.isInitial) || pipeline[0];
      if (initial?.allowedTransitions?.length) return initial.allowedTransitions;
      return pipeline.map((s) => s.status);
    }
    if (currentStep.allowedTransitions?.length) return currentStep.allowedTransitions;
    // If transitions not configured, allow any other stage in pipeline
    return pipeline.filter((s) => s.status !== currentStep.status).map((s) => s.status);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapStage(s: any, currentStatus: string | null, currentIndex: number, stageIndex: number) {
    const isCurrent =
      normalizeStatus(s.status) === normalizeStatus(currentStatus) ||
      normalizeStatus(s.label) === normalizeStatus(currentStatus);

    const currentNorm = normalizeStatus(currentStatus);
    const stageNorm = normalizeStatus(s.status);
    let isPast = false;
    if (currentIndex >= 0 && stageIndex < currentIndex) {
      if (currentNorm === 'rejected') {
        isPast = false;
      } else if (stageNorm === 'rejected') {
        isPast = false;
      } else {
        isPast = true;
      }
    }

    return {
      id: s.id,
      status: s.status,
      label: s.label || s.status,
      order: s.order,
      color: s.color,
      isInitial: s.isInitial,
      isFinal: s.isFinal,
      isCurrent,
      isPast: isCurrent ? false : isPast,
      allowedTransitions: s.allowedTransitions || [],
    };
  }

  private toEntityStatus(entityType: string, status: string): string {
    if (entityType !== 'lead') return status;
    const map: Record<string, string> = {
      new: 'New',
      contacted: 'Contacted',
      designpending: 'DesignPending',
      boqpending: 'BOQPending',
      estimatesent: 'EstimateSent',
      proposalsent: 'ProposalSent',
      negotiation: 'Negotiation',
      approved: 'Approved',
      rejected: 'Rejected',
      converted: 'Converted',
    };
    return map[normalizeStatus(status)] || status;
  }
}
