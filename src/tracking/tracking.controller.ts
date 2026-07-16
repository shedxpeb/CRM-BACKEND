import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../common/types';

@ApiTags('tracking')
@ApiBearerAuth()
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  private getUser(user: CurrentUserType | undefined): Required<Pick<CurrentUserType, 'id' | 'organizationId'>> {
    if (!user?.organizationId || !user.id) throw new UnauthorizedException();
    return user as Required<Pick<CurrentUserType, 'id' | 'organizationId'>>;
  }

  // ─── UNIFIED TRACKING ENDPOINT ─────────────────────────

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Get all tracking data for an entity (pipeline, status, timeline, comments, attachments, approvals, stage details)' })
  async getTracking(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.getTrackingData(entityType, entityId, u.organizationId);
    return { message: 'Tracking data fetched', data };
  }

  // ─── STATUS ────────────────────────────────────────────

  @Get(':entityType/:entityId/status')
  @ApiOperation({ summary: 'Get current status + allowed transitions + pipeline' })
  async getStatus(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.getStatus(entityType, entityId, u.organizationId);
    return { message: 'Status fetched', data };
  }

  @Get(':entityType/pipeline')
  @ApiOperation({ summary: 'Get status pipeline definition for entity type' })
  async getPipeline(
    @Param('entityType') entityType: string,
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.getPipeline(entityType, u.organizationId);
    return { message: 'Pipeline fetched', data };
  }

  @Post(':entityType/:entityId/status')
  @ApiOperation({ summary: 'Change entity status' })
  async changeStatus(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() body: { status: string; reason?: string },
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.changeStatus(entityType, entityId, body.status, u.organizationId, u.id, body.reason);
    return { message: 'Status updated', data };
  }

  // ─── TIMELINE ──────────────────────────────────────────

  @Get(':entityType/:entityId/timeline')
  @ApiOperation({ summary: 'Get full timeline (status changes + activities)' })
  async getTimeline(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.getTimeline(entityType, entityId, u.organizationId);
    return { message: 'Timeline fetched', data };
  }

  // ─── COMMENTS ──────────────────────────────────────────

  @Get(':entityType/:entityId/comments')
  @ApiOperation({ summary: 'Get entity comments' })
  async getComments(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.getComments(entityType, entityId, u.organizationId);
    return { message: 'Comments fetched', data };
  }

  @Post(':entityType/:entityId/comments')
  @ApiOperation({ summary: 'Add comment to entity' })
  async addComment(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() body: { content: string; parentId?: string },
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.addComment(entityType, entityId, body.content, u.organizationId, u.id, body.parentId);
    return { message: 'Comment added', data };
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete comment' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.deleteComment(commentId, u.organizationId, u.id);
    return { message: 'Comment deleted', data };
  }

  // ─── ATTACHMENTS ──────────────────────────────────────

  @Get(':entityType/:entityId/attachments')
  @ApiOperation({ summary: 'Get entity attachments' })
  async getAttachments(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.getAttachments(entityType, entityId, u.organizationId);
    return { message: 'Attachments fetched', data };
  }

  @Post(':entityType/:entityId/attachments')
  @ApiOperation({ summary: 'Add attachment to entity' })
  async addAttachment(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() body: { fileName: string; originalName: string; mimeType: string; size: number; url: string; category?: string },
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.addAttachment(entityType, entityId, body, u.organizationId, u.id);
    return { message: 'Attachment added', data };
  }

  @Delete('attachments/:attachmentId')
  @ApiOperation({ summary: 'Delete attachment' })
  async deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.deleteAttachment(attachmentId, u.organizationId);
    return { message: 'Attachment deleted', data };
  }

  // ─── APPROVALS ────────────────────────────────────────

  @Get(':entityType/:entityId/approvals')
  @ApiOperation({ summary: 'Get entity approvals' })
  async getApprovals(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.getApprovals(entityType, entityId, u.organizationId);
    return { message: 'Approvals fetched', data };
  }

  @Post(':entityType/:entityId/approvals')
  @ApiOperation({ summary: 'Request approval' })
  async requestApproval(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() body: { approverId: string; level?: number; metadata?: any },
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.requestApproval(entityType, entityId, body.approverId, u.organizationId, u.id, body.level, body.metadata);
    return { message: 'Approval requested', data };
  }

  @Patch('approvals/:approvalId')
  @ApiOperation({ summary: 'Respond to approval (Approve/Reject)' })
  async respondToApproval(
    @Param('approvalId') approvalId: string,
    @Body() body: { status: 'Approved' | 'Rejected'; comment?: string },
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.respondToApproval(approvalId, body.status, u.organizationId, body.comment);
    return { message: `Approval ${body.status.toLowerCase()}`, data };
  }

  // ─── NOTIFICATIONS ────────────────────────────────────

  @Get('notifications')
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications(
    @Query('unreadOnly') unreadOnly?: string,
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.getNotifications(u.id, u.organizationId, unreadOnly === 'true');
    return { message: 'Notifications fetched', data };
  }

  @Post('notifications')
  @ApiOperation({ summary: 'Create notification' })
  async createNotification(
    @Body() body: { userId: string; title: string; message: string; type?: string; entityType?: string; entityId?: string },
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.createNotification({ ...body, organizationId: u.organizationId });
    return { message: 'Notification created', data };
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markNotificationRead(
    @Param('id') id: string,
    @CurrentUser() user?: CurrentUserType,
  ) {
    const u = this.getUser(user);
    const data = await this.trackingService.markNotificationRead(id, u.id);
    return { message: 'Notification marked as read', data };
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user?: CurrentUserType) {
    const u = this.getUser(user);
    const data = await this.trackingService.markAllNotificationsRead(u.id, u.organizationId);
    return { message: 'All notifications marked as read', data };
  }
}
