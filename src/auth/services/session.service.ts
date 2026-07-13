import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createSession(params: {
    userId: string;
    organizationId?: string;
    device?: string;
    browser?: string;
    os?: string;
    ipAddress?: string;
    userAgent?: string;
    isRememberMe?: boolean;
    refreshTokenHash?: string;
  }) {
    const { userId, organizationId, refreshTokenHash, isRememberMe = false, ...rest } = params;
    const sessionToken = randomBytes(48).toString('hex');

    const now = new Date();
    const absoluteExpiry = new Date(now.getTime() + (isRememberMe ? 30 : 1) * 24 * 60 * 60 * 1000);
    const idleExpiry = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Revoke any existing sessions for this user
    await this.prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: now },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: now },
    });

    const session = await this.prisma.session.create({
      data: {
        userId,
        organizationId,
        token: sessionToken,
        refreshToken: refreshTokenHash,
        expiresAt: absoluteExpiry,
        idleExpiresAt: idleExpiry,
        isRememberMe,
        ...rest,
      },
    });

    this.logger.log(`Session created: ${session.id} for user ${userId}`);

    return session;
  }

  async validateSession(sessionToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (!session) return null;
    if (session.isRevoked) return null;
    if (new Date() > session.expiresAt) return null;
    if (new Date() > session.idleExpiresAt) return null;

    return session;
  }

  async touchSession(sessionId: string) {
    const now = new Date();
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        lastActivity: now,
        idleExpiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      },
    });
  }

  async revokeSession(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    await this.prisma.refreshToken.updateMany({
      where: { sessionId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string) {
    const where: any = { userId, isRevoked: false };
    if (exceptSessionId) where.id = { not: exceptSessionId };

    await this.prisma.session.updateMany({
      where,
      data: { isRevoked: true, revokedAt: new Date() },
    });

    const sessionWhere: any = { userId, isRevoked: false };
    if (exceptSessionId) sessionWhere.sessionId = { not: exceptSessionId };

    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }
}
