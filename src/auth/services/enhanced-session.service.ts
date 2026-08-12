import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionInheritanceService } from '../../permissions/permission-inheritance.service';

/**
 * Enhanced Session Service
 * 
 * Manages user sessions with full context:
 * - Organization permissions
 * - Module access
 * - Effective permissions
 * - Security metadata
 * - Session validation with permission versioning
 */
@Injectable()
export class EnhancedSessionService {
  private readonly logger = new Logger(EnhancedSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionInheritance: PermissionInheritanceService,
  ) {}

  /**
   * Create session with full context
   */
  async createSessionWithContext(dto: CreateSessionDto) {
    this.logger.log(`Creating session for user ${dto.userId} in organization ${dto.organizationId}`);

    // Parse user agent for device information
    const deviceInfo = this.parseDeviceInfo(dto.userAgent);
    const browserInfo = this.parseBrowserInfo(dto.userAgent);
    const osInfo = this.parseOSInfo(dto.userAgent);

    // Get user's effective permissions
    const effectivePermissions = await this.permissionInheritance.getEffectivePermissions(
      dto.userId,
      dto.organizationId,
    );

    // Get user's current permission version
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { permissionVersion: true },
    });

    // Calculate session expiry
    const expiresAt = this.calculateExpiry(dto.rememberMe);
    const idleExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes idle timeout

    const session = await this.prisma.session.create({
      data: {
        userId: dto.userId,
        organizationId: dto.organizationId,
        token: dto.token,
        refreshToken: dto.refreshToken,
        device: deviceInfo.device,
        browser: browserInfo.name,
        os: osInfo.name,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        loginAt: new Date(),
        lastActivity: new Date(),
        expiresAt,
        idleExpiresAt,
        isRememberMe: dto.rememberMe || false,
      },
    });

    this.logger.log(`Session created: ${session.id}`);

    return {
      session,
      effectivePermissions,
      permissionVersion: user?.permissionVersion || 1,
      deviceInfo,
      browserInfo,
      osInfo,
    };
  }

  /**
   * Validate session with permissions
   * Reloads permissions if permission version changed
   */
  async validateSessionWithPermissions(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            permissionVersion: true,
            isActive: true,
            isLocked: true,
            organizationId: true,
          },
        },
      },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    // Check if session is revoked
    if (session.isRevoked) {
      throw new ForbiddenException('Session has been revoked');
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      throw new ForbiddenException('Session has expired');
    }

    // Check idle timeout
    if (session.idleExpiresAt < new Date()) {
      await this.revokeSession(sessionId, 'Idle timeout');
      throw new ForbiddenException('Session expired due to inactivity');
    }

    // Check user status
    if (!session.user.isActive) {
      throw new ForbiddenException('User account is not active');
    }

    if (session.user.isLocked) {
      throw new ForbiddenException('User account is locked');
    }

    // Update last activity
    await this.touchSession(sessionId);

    // Get effective permissions
    const organizationId = session.user.organizationId || session.organizationId;
    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    const effectivePermissions = await this.permissionInheritance.getEffectivePermissions(
      session.user.id,
      organizationId,
    );

    return {
      session,
      user: session.user,
      effectivePermissions,
      permissionVersion: session.user.permissionVersion,
    };
  }

  /**
   * Terminate all sessions for a user
   */
  async terminateUserSessions(
    userId: string,
    organizationId: string,
    terminatorId: string,
    reason: string,
  ) {
    this.logger.log(`Terminating all sessions for user ${userId} in organization ${organizationId}`);

    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        organizationId,
        isRevoked: false,
      },
    });

    for (const session of sessions) {
      await this.revokeSession(session.id, reason, terminatorId);
    }

    // Log the termination
    await this.prisma.auditLog.create({
      data: {
        action: 'USER_SESSIONS_TERMINATED',
        organizationId,
        userId: terminatorId,
        metadata: {
          targetUserId: userId,
          sessionsTerminated: sessions.length,
          reason,
        },
        severity: 'WARNING',
      },
    });

    return {
      message: `Terminated ${sessions.length} sessions for user`,
      sessionsTerminated: sessions.length,
    };
  }

  /**
   * Terminate all sessions for an organization
   * Emergency security measure
   */
  async terminateOrganizationSessions(
    organizationId: string,
    terminatorId: string,
    reason: string,
  ) {
    this.logger.warn(`Emergency termination of all sessions for organization ${organizationId}`);

    const sessions = await this.prisma.session.findMany({
      where: {
        organizationId,
        isRevoked: false,
      },
    });

    for (const session of sessions) {
      await this.revokeSession(session.id, reason, terminatorId);
    }

    // Log the emergency termination
    await this.prisma.auditLog.create({
      data: {
        action: 'ORGANIZATION_SESSIONS_TERMINATED',
        organizationId,
        userId: terminatorId,
        metadata: {
          sessionsTerminated: sessions.length,
          reason,
          emergency: true,
        },
        severity: 'CRITICAL',
      },
    });

    return {
      message: `Emergency termination of ${sessions.length} sessions`,
      sessionsTerminated: sessions.length,
    };
  }

  /**
   * Get all active sessions for an organization
   */
  async getActiveSessions(organizationId: string) {
    const sessions = await this.prisma.session.findMany({
      where: {
        organizationId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        lastActivity: 'desc',
      },
    });

    return sessions.map(session => ({
      id: session.id,
      userId: session.userId,
      userEmail: session.user.email,
      userName: session.user.name,
      userRole: session.user.role,
      device: session.device,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      loginAt: session.loginAt,
      lastActivity: session.lastActivity,
      expiresAt: session.expiresAt,
      isRememberMe: session.isRememberMe,
    }));
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string, reason: string, revokedBy?: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    this.logger.log(`Session ${sessionId} revoked. Reason: ${reason}`);
  }

  /**
   * Update session last activity
   */
  async touchSession(sessionId: string) {
    const idleExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // Reset idle timeout

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        lastActivity: new Date(),
        idleExpiresAt,
      },
    });
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    const expiredSessions = await this.prisma.session.findMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { idleExpiresAt: { lt: new Date() } },
        ],
        isRevoked: false,
      },
    });

    for (const session of expiredSessions) {
      await this.revokeSession(session.id, 'Session expired');
    }

    this.logger.log(`Cleaned up ${expiredSessions.length} expired sessions`);

    return { cleanedUp: expiredSessions.length };
  }

  /**
   * Get session statistics for organization
   */
  async getSessionStatistics(organizationId: string) {
    const totalSessions = await this.prisma.session.count({
      where: { organizationId },
    });

    const activeSessions = await this.prisma.session.count({
      where: {
        organizationId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    const uniqueUsers = await this.prisma.session.groupBy({
      by: ['userId'],
      where: {
        organizationId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    const deviceStats = await this.prisma.session.groupBy({
      by: ['device'],
      where: {
        organizationId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      _count: true,
    });

    return {
      totalSessions,
      activeSessions,
      uniqueUsers: uniqueUsers.length,
      deviceBreakdown: deviceStats.map(stat => ({
        device: stat.device,
        count: stat._count,
      })),
    };
  }

  /**
   * Calculate session expiry based on remember me preference
   */
  private calculateExpiry(rememberMe: boolean = false): Date {
    const hours = rememberMe ? 30 * 24 : 1; // 30 days if remember me, else 1 hour
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  /**
   * Parse device information from user agent
   */
  private parseDeviceInfo(userAgent: string): { device: string; type: string } {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return { device: 'Mobile', type: 'mobile' };
    }
    
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return { device: 'Tablet', type: 'tablet' };
    }
    
    return { device: 'Desktop', type: 'desktop' };
  }

  /**
   * Parse browser information from user agent
   */
  private parseBrowserInfo(userAgent: string): { name: string; version: string } {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('chrome')) {
      const match = ua.match(/chrome\/(\d+\.\d+\.\d+\.\d+)/);
      return { name: 'Chrome', version: match ? match[1] : 'Unknown' };
    }
    
    if (ua.includes('firefox')) {
      const match = ua.match(/firefox\/(\d+\.\d+)/);
      return { name: 'Firefox', version: match ? match[1] : 'Unknown' };
    }
    
    if (ua.includes('safari') && !ua.includes('chrome')) {
      const match = ua.match(/version\/(\d+\.\d+)/);
      return { name: 'Safari', version: match ? match[1] : 'Unknown' };
    }
    
    if (ua.includes('edge')) {
      const match = ua.match(/edge\/(\d+\.\d+\.\d+\.\d+)/);
      return { name: 'Edge', version: match ? match[1] : 'Unknown' };
    }
    
    return { name: 'Unknown', version: 'Unknown' };
  }

  /**
   * Parse OS information from user agent
   */
  private parseOSInfo(userAgent: string): { name: string; version: string } {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('windows')) {
      if (ua.includes('windows 10')) return { name: 'Windows', version: '10' };
      if (ua.includes('windows 11')) return { name: 'Windows', version: '11' };
      return { name: 'Windows', version: 'Unknown' };
    }
    
    if (ua.includes('mac os') || ua.includes('macos')) {
      const match = ua.match(/mac os x (\d+[_\.]\d+[_\.]\d+)/);
      return { name: 'macOS', version: match ? match[1].replace(/_/g, '.') : 'Unknown' };
    }
    
    if (ua.includes('linux')) {
      return { name: 'Linux', version: 'Unknown' };
    }
    
    if (ua.includes('android')) {
      const match = ua.match(/android (\d+\.\d+)/);
      return { name: 'Android', version: match ? match[1] : 'Unknown' };
    }
    
    if (ua.includes('iphone') || ua.includes('ipad')) {
      const match = ua.match(/os (\d+[_\.]\d+[_\.]\d+)/);
      return { name: 'iOS', version: match ? match[1].replace(/_/g, '.') : 'Unknown' };
    }
    
    return { name: 'Unknown', version: 'Unknown' };
  }
}

// DTOs
export interface CreateSessionDto {
  userId: string;
  organizationId: string;
  token: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  rememberMe?: boolean;
}