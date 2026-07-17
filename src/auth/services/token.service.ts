import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  generateAccessToken(params: {
    userId: string;
    email: string;
    role: string;
    organizationId?: string;
    sessionId: string;
    permissionVersion?: number;
    passwordVersion?: number;
  }): string {
    return this.jwtService.sign(
      {
        sub: params.userId,
        email: params.email,
        role: params.role,
        organizationId: params.organizationId,
        sessionId: params.sessionId,
        permissionVersion: params.permissionVersion || 1,
        tokenVersion: 1,
        passwordVersion: params.passwordVersion || 1,
      } as any,
      {
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn') || '30m',
      } as any,
    );
  }

  generateRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(64).toString('hex');
    const hash = createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  generateSessionCookieValue(): string {
    return randomBytes(32).toString('hex');
  }
}
