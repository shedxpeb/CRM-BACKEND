import { Injectable, UnauthorizedException } from '@nestjs/common';
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
  sessionId: string;
  permissionVersion: number;
  tokenVersion: number;
  passwordVersion?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
    private sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
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
        passwordVersion: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }
    if (user.isLocked) {
      throw new UnauthorizedException('Account has been locked');
    }
    if (payload.passwordVersion !== undefined && payload.passwordVersion !== user.passwordVersion) {
      throw new UnauthorizedException('Session is no longer valid. Please sign in again.');
    }

    if (!payload.sessionId) {
      throw new UnauthorizedException('Invalid session');
    }

    const session = await this.sessionService.validateSessionById(payload.sessionId);
    if (!session) {
      throw new UnauthorizedException('Session has expired or been revoked');
    }

    await this.sessionService.touchSession(payload.sessionId);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationType: user.organizationType,
      organizationId: user.organizationId || payload.organizationId,
      sessionId: payload.sessionId,
    };
  }
}
