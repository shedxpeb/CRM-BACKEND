import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  organizationId?: string;
  sessionId: string;
  permissionVersion: number;
  tokenVersion: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
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

    // Validate session still exists and is not revoked
    if (payload.sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
      });
      if (!session || session.isRevoked) {
        throw new UnauthorizedException('Session has been revoked');
      }
      // Touch session activity
      await this.prisma.session.update({
        where: { id: payload.sessionId },
        data: { lastActivity: new Date() },
      });
    } else {
      // Legacy tokens without sessionId — still allow but warn
    }

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
