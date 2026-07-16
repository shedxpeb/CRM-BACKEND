import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private absoluteMs(rememberMe: boolean) {
    const days = rememberMe
      ? this.config.get<number>('session.rememberMeDays') || 30
      : this.config.get<number>('session.absoluteDays') || 1;
    return days * 24 * 60 * 60 * 1000;
  }

  private idleMs() {
    const minutes = this.config.get<number>('session.idleMinutes') || 120;
    return minutes * 60 * 1000;
  }

  private multiDevice() {
    return this.config.get<boolean>('session.multiDevice') === true;
  }

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
    const absoluteExpiry = new Date(now.getTime() + this.absoluteMs(isRememberMe));
    const idleExpiry = new Date(now.getTime() + this.idleMs());

    if (!this.multiDevice()) {
      await this.revokeAllUserSessions(userId);
    }

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

  async validateSessionById(sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.isRevoked) return null;
    const now = new Date();
    if (now > session.expiresAt || now > session.idleExpiresAt) {
      await this.revokeSession(session.id);
      return null;
    }
    return session;
  }

  async touchSession(sessionId: string) {
    const now = new Date();
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { lastActivity: true },
    });
    // Throttle DB writes: only touch if last activity older than 60s
    if (session?.lastActivity && now.getTime() - session.lastActivity.getTime() < 60_000) {
      return;
    }
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        lastActivity: now,
        idleExpiresAt: new Date(now.getTime() + this.idleMs()),
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
    const sessionWhere: any = { userId, isRevoked: false };
    if (exceptSessionId) sessionWhere.id = { not: exceptSessionId };

    await this.prisma.session.updateMany({
      where: sessionWhere,
      data: { isRevoked: true, revokedAt: new Date() },
    });

    const refreshWhere: any = { userId, isRevoked: false };
    if (exceptSessionId) refreshWhere.sessionId = { not: exceptSessionId };

    await this.prisma.refreshToken.updateMany({
      where: refreshWhere,
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }
}
