import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    action: string;
    organizationId?: string;
    userId?: string;
    sessionId?: string;
    resource?: string;
    resourceId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.prisma.auditLog.create({ data: params as any });
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${error.message}`);
    }
  }

  async getLogs(params: {
    organizationId?: string;
    userId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (params.organizationId) where.organizationId = params.organizationId;
    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = params.action;

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit || 50,
        skip: params.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { rows, total };
  }
}
