import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { AuditService } from './services/audit.service';
import { LoginProtectionService } from './services/login-protection.service';
import { OtpService } from './services/otp.service';
import { CookieInterceptor } from './cookie.interceptor';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expiresIn: (configService.get<string>('jwt.accessExpiresIn') || '30m') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    TokenService,
    SessionService,
    AuditService,
    LoginProtectionService,
    OtpService,
    CookieInterceptor,
  ],
  exports: [AuthService, TokenService, SessionService, AuditService, OtpService, JwtModule],
})
export class AuthModule {
  static readonly moduleCapability = { capability: 'auth' } as const;
}
