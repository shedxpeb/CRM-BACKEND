import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from '../services/session.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  organizationId?: string;
  tenantId?: string;
  crmOrganizationId?: string;
  sessionId: string;
  permissionVersion: number;
  tokenVersion: number;
  passwordVersion?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
    private sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationType: true,
        organizationId: true,
        isActive: true,
        isVerified: true,
        isLocked: true,
        lockedUntil: true,
        passwordVersion: true,
      },
    });

    if (!user || !user.isActive) {
      this.logger.warn(`Auth rejected: user ${payload.sub} not found or inactive`);
      throw new UnauthorizedException('Account is not active');
    }
    if (user.isLocked) {
      this.logger.warn(`Auth rejected: user ${payload.email} is locked`);
      throw new UnauthorizedException('Account has been locked');
    }
    // Temporary lockout (failed login protection)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      this.logger.warn(
        `Auth rejected: user ${payload.email} temporarily locked until ${user.lockedUntil.toISOString()}`,
      );
      throw new UnauthorizedException('Account is temporarily locked. Try again later.');
    }
    if (payload.passwordVersion !== undefined && payload.passwordVersion !== user.passwordVersion) {
      this.logger.warn(
        `Auth rejected: user ${payload.email} passwordVersion mismatch (jwt=${payload.passwordVersion}, db=${user.passwordVersion})`,
      );
      throw new UnauthorizedException('Session is no longer valid. Please sign in again.');
    }

    if (!payload.sessionId) {
      this.logger.warn(`Auth rejected: user ${payload.email} has no sessionId in JWT`);
      throw new UnauthorizedException('Invalid session');
    }

    const session = await this.sessionService.validateSessionById(payload.sessionId);
    if (!session) {
      this.logger.warn(
        `Auth rejected: session ${payload.sessionId} invalid for user ${payload.email} (expired or revoked)`,
      );
      throw new UnauthorizedException('Session has expired or been revoked');
    }

    await this.sessionService.touchSession(payload.sessionId);

    // Validate tenant context - ensure organizationId is present for non-super-admin users
    const resolvedOrganizationId = user.organizationId || payload.organizationId;
    if (user.role !== 'SUPER_ADMIN' && !resolvedOrganizationId) {
      this.logger.warn(`Auth rejected: user ${payload.email} has no organizationId`);
      throw new UnauthorizedException('Organization context is required');
    }

    // Tenant mismatch validation: ensure JWT organizationId matches database
    if (
      payload.organizationId &&
      user.organizationId &&
      payload.organizationId !== user.organizationId
    ) {
      this.logger.warn(
        `Auth rejected: tenant mismatch for ${payload.email} (jwt=${payload.organizationId}, db=${user.organizationId})`,
      );
      throw new UnauthorizedException('Tenant context mismatch detected');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationType: user.organizationType,
      organizationId: resolvedOrganizationId,
      tenantId: payload.tenantId || resolvedOrganizationId,
      crmOrganizationId: payload.crmOrganizationId || resolvedOrganizationId,
      sessionId: payload.sessionId,
    };
  }
}
