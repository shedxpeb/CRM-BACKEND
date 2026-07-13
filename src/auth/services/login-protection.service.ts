import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const LOCKOUT_THRESHOLD = 7;
const LOCKOUT_DURATIONS = [10 * 60 * 1000, 30 * 60 * 1000, 60 * 60 * 1000]; // 10min, 30min, 1hr

@Injectable()
export class LoginProtectionService {
  private readonly logger = new Logger(LoginProtectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordAttempt(params: {
    email: string;
    organizationId?: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    failureReason?: string;
  }) {
    await this.prisma.loginAttempt.create({ data: params as any });

    if (!params.success) {
      await this.prisma.user.updateMany({
        where: { email: params.email },
        data: { failedLoginAttempts: { increment: 1 } },
      });

      const recentFailures = await this.prisma.loginAttempt.count({
        where: {
          email: params.email,
          success: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (recentFailures > 0 && recentFailures % LOCKOUT_THRESHOLD === 0) {
        const lockIndex = Math.min(Math.floor(recentFailures / LOCKOUT_THRESHOLD) - 1, LOCKOUT_DURATIONS.length - 1);
        const duration = LOCKOUT_DURATIONS[lockIndex];
        const lockedUntil = new Date(Date.now() + duration);

        await this.prisma.user.updateMany({
          where: { email: params.email },
          data: {
            lockedUntil,
            failedLoginAttempts: recentFailures,
          },
        });

        await this.prisma.loginAttempt.create({
          data: {
            email: params.email,
            organizationId: params.organizationId,
            ipAddress: params.ipAddress,
            success: false,
            failureReason: `Account locked for ${duration / 60000} minutes (${recentFailures} failures)`,
            lockedUntil,
          },
        });

        this.logger.warn(`Account locked: ${params.email} until ${lockedUntil}`);
        return { locked: true, lockedUntil };
      }
    } else {
      await this.prisma.user.updateMany({
        where: { email: params.email },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    return { locked: false };
  }

  async isLocked(email: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { lockedUntil: true, failedLoginAttempts: true },
    });

    if (!user) return { locked: false };

    if (user.lockedUntil && new Date() < user.lockedUntil) {
      return { locked: true, lockedUntil: user.lockedUntil };
    }

    if (user.lockedUntil && new Date() >= user.lockedUntil) {
      await this.prisma.user.update({
        where: { email },
        data: { lockedUntil: null, failedLoginAttempts: 0 },
      });
    }

    return { locked: false };
  }
}
