import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { AuditService } from './services/audit.service';
import { LoginProtectionService } from './services/login-protection.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_OTP_ATTEMPTS = 5;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private mailService: MailService,
    private tokenService: TokenService,
    private sessionService: SessionService,
    private auditService: AuditService,
    private loginProtection: LoginProtectionService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new BadRequestException('An account with this email already exists');
    }

    // If a company name is provided, check no organization with that name exists already
    if (dto.companyName) {
      const existingOrg = await this.prisma.organization.findFirst({
        where: { name: dto.companyName, isDeleted: false },
      });
      if (existingOrg) {
        throw new BadRequestException('An organization with this name already exists');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const otp = this.generateOtp();
    const otpExpiry = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.companyName || `${dto.email.split('@')[0]}'s Company`,
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name || dto.email.split('@')[0],
          password: passwordHash,
          otp,
          otpExpiry,
          role: 'OWNER',
          organizationType: 'COMPANY',
          organizationId: organization.id,
          passwordHistory: JSON.stringify([{ password: passwordHash, changedAt: new Date().toISOString() }]),
        },
      });

      const defaultRoles = [
        { name: 'Owner', permissions: [] },
        { name: 'Admin', permissions: [] },
        { name: 'Employee', permissions: [] },
      ];

      for (const role of defaultRoles) {
        await tx.role.create({
          data: {
            organizationId: organization.id,
            name: role.name,
            permissions: role.permissions,
            isSystem: true,
            createdById: user.id,
          },
        });
      }

      return { organization, user };
    });

    this.mailService.sendOtpEmail(dto.email, otp, 'registration').catch((err) => {
      console.error(`[MailService] Failed to send registration OTP to ${dto.email}:`, err.message);
    });

    return {
      message: 'Account created. Please verify your email with the OTP sent.',
      email: result.user.email,
      otp,
    };
  }

  async verifyOtp(dto: VerifyOtpDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { organization: true },
    });
    if (!user) throw new BadRequestException('No account found with this email');
    if (user.isVerified) throw new BadRequestException('Email is already verified');
    if (!user.otp || !user.otpExpiry) throw new BadRequestException('No OTP has been sent');
    if (user.otpAttempts >= this.MAX_OTP_ATTEMPTS) throw new BadRequestException('Too many failed attempts');
    if (new Date() > user.otpExpiry) throw new BadRequestException('OTP has expired');

    if (user.otp !== dto.otp) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: { increment: 1 } },
      });
      const remaining = this.MAX_OTP_ATTEMPTS - (user.otpAttempts + 1);
      throw new BadRequestException(
        remaining > 0 ? `Invalid OTP. ${remaining} attempt(s) remaining.` : 'Invalid OTP. No attempts remaining.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, isActive: true, otp: null, otpExpiry: null, otpAttempts: 0 },
    });

    // Create session and generate tokens
    const session = await this.sessionService.createSession({
      userId: user.id,
      organizationId: this.orgId(user),
      ipAddress,
      userAgent,
    });

    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: this.orgId(user),
      sessionId: session.id,
    });

    const refresh = this.tokenService.generateRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: refresh.hash,
        sessionId: session.id,
        userId: user.id,
        organizationId: this.orgId(user),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: refresh.hash },
    });

    await this.auditService.log({
      action: 'LOGIN',
      organizationId: this.orgId(user),
      userId: user.id,
      sessionId: session.id,
      ipAddress,
      userAgent,
      metadata: { method: 'otp_verification' },
    });

    return {
      message: 'Email verified successfully.',
      accessToken,
      refreshToken: refresh.token,
      sessionId: session.id,
      expiresIn: 1800,
      rememberMe: false,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationType: user.organizationType,
        organizationId: this.orgId(user),
        organizationName: user.organization?.name,
      },
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { organization: true },
    });

    if (!user) {
      await this.loginProtection.recordAttempt({
        email: dto.email, success: false, failureReason: 'User not found', ipAddress, userAgent,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check lockout
    const lockStatus = await this.loginProtection.isLocked(dto.email);
    if (lockStatus.locked) {
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        organizationId: this.orgId(user),
        userId: user.id,
        ipAddress,
        userAgent,
        metadata: { reason: 'Account locked', lockedUntil: lockStatus.lockedUntil },
      });
      throw new ForbiddenException(
        `Account is temporarily locked. Try again after ${lockStatus.lockedUntil?.toLocaleTimeString() || 'some time'}.`,
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active. Please verify your email.');
    }

    if (user.isLocked) {
      throw new ForbiddenException('Account has been locked. Contact your administrator.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      await this.loginProtection.recordAttempt({
        email: dto.email, organizationId: this.orgId(user),
        success: false, failureReason: 'Invalid password', ipAddress, userAgent,
      });
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        organizationId: this.orgId(user),
        userId: user.id,
        ipAddress,
        userAgent,
        metadata: { reason: 'Invalid password' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Record successful login
    await this.loginProtection.recordAttempt({
      email: dto.email, organizationId: this.orgId(user),
      success: true, ipAddress, userAgent,
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });

    // Revoke previous sessions
    const device = userAgent?.split(' ')[0];
    const browser = this.parseBrowser(userAgent);
    const os = this.parseOS(userAgent);

    const session = await this.sessionService.createSession({
      userId: user.id,
      organizationId: this.orgId(user),
      device,
      browser,
      os,
      ipAddress,
      userAgent,
      isRememberMe: dto.rememberMe || false,
    });

    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: this.orgId(user),
      sessionId: session.id,
    });

    const refreshTokenExpiry = dto.rememberMe ? 30 : 1;
    const refresh = this.tokenService.generateRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: refresh.hash,
        sessionId: session.id,
        userId: user.id,
        organizationId: this.orgId(user),
        expiresAt: new Date(Date.now() + refreshTokenExpiry * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: refresh.hash },
    });

    await this.auditService.log({
      action: 'LOGIN',
      organizationId: this.orgId(user),
      userId: user.id,
      sessionId: session.id,
      ipAddress,
      userAgent,
      metadata: { device, browser, os, rememberMe: dto.rememberMe },
    });

    return {
      accessToken,
      refreshToken: refresh.token,
      sessionId: session.id,
      expiresIn: 1800,
      rememberMe: dto.rememberMe || false,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationType: user.organizationType,
        organizationId: this.orgId(user),
        organizationName: user.organization?.name,
      },
    };
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { session: true, user: true },
    });

    if (!storedToken) throw new UnauthorizedException('Invalid refresh token');
    if (storedToken.isRevoked) throw new UnauthorizedException('Refresh token has been revoked');
    if (new Date() > storedToken.expiresAt) throw new UnauthorizedException('Refresh token has expired');

    // Check session still valid
    if (storedToken.session.isRevoked) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true, revokedAt: new Date() },
      });
      throw new UnauthorizedException('Session has been revoked');
    }

    // Rotate: revoke old, issue new
    const newRefresh = this.tokenService.generateRefreshToken();
    const newExpiry = storedToken.session.isRememberMe ? 30 : 1;

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          replacedByTokenHash: newRefresh.hash,
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          tokenHash: newRefresh.hash,
          sessionId: storedToken.sessionId,
          userId: storedToken.userId,
          organizationId: storedToken.organizationId,
          expiresAt: new Date(Date.now() + newExpiry * 24 * 60 * 60 * 1000),
        },
      }),
      this.prisma.session.update({
        where: { id: storedToken.sessionId },
        data: {
          refreshToken: newRefresh.hash,
          lastActivity: new Date(),
        },
      }),
    ]);

    // Extend idle timeout
    await this.sessionService.touchSession(storedToken.sessionId);

    const accessToken = this.tokenService.generateAccessToken({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
      organizationId: storedToken.organizationId ?? undefined,
      sessionId: storedToken.sessionId,
    });

    await this.auditService.log({
      action: 'REFRESH',
      organizationId: storedToken.organizationId ?? undefined,
      userId: storedToken.userId,
      sessionId: storedToken.sessionId,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken: newRefresh.token,
      sessionId: storedToken.sessionId,
      expiresIn: 1800,
      rememberMe: storedToken.session.isRememberMe,
    };
  }

  async logout(sessionId: string, userId: string, ipAddress?: string, userAgent?: string) {
    await this.sessionService.revokeSession(sessionId);

    await this.auditService.log({
      action: 'LOGOUT',
      userId,
      sessionId,
      ipAddress,
      userAgent,
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        mobile: true,
        avatar: true,
        department: true,
        designation: true,
        role: true,
        organizationType: true,
        organizationId: true,
        isActive: true,
        isVerified: true,
        isLocked: true,
        lastLogin: true,
        createdAt: true,
        organization: { select: { name: true } },
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    const { organization, ...rest } = user;
    return { ...rest, organizationName: organization?.name };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new BadRequestException('No account found with this email');

    const otp = this.generateOtp();
    const otpExpiry = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { otp, otpExpiry, otpAttempts: 0 },
    });
    this.mailService.sendOtpEmail(dto.email, otp, 'forgot-password').catch((err) => {
      console.error(`[MailService] Failed to send forgot-password OTP to ${dto.email}:`, err.message);
    });

    const response: any = { message: 'OTP sent to your email', email: user.email };
    if (this.configService.get<string>('nodeEnv') !== 'production') {
      response.otp = otp;
    }
    return response;
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new BadRequestException('No account found with this email');
    if (user.isVerified) throw new BadRequestException('Email is already verified');

    const otp = this.generateOtp();
    const otpExpiry = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { otp, otpExpiry, otpAttempts: 0 },
    });
    this.mailService.sendOtpEmail(dto.email, otp, 'registration').catch((err) => {
      console.error(`[MailService] Failed to send registration OTP to ${dto.email}:`, err.message);
    });

    const response: any = { message: 'New OTP sent to your email', email: user.email };
    if (this.configService.get<string>('nodeEnv') !== 'production') {
      response.otp = otp;
    }
    return response;
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new BadRequestException('No account found with this email');
    if (!user.otp || !user.otpExpiry) throw new BadRequestException('No OTP has been sent');
    if (user.otpAttempts >= this.MAX_OTP_ATTEMPTS) throw new BadRequestException('Too many failed attempts');
    if (new Date() > user.otpExpiry) throw new BadRequestException('OTP has expired');
    if (user.otp !== dto.otp) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: { increment: 1 } },
      });
      const remaining = this.MAX_OTP_ATTEMPTS - (user.otpAttempts + 1);
      throw new BadRequestException(
        remaining > 0 ? `Invalid OTP. ${remaining} attempt(s) remaining.` : 'Invalid OTP. No attempts remaining.',
      );
    }

    // Check password history (prevent reuse)
    if (user.passwordHistory) {
      const history: Array<{ password: string; changedAt: string }> = JSON.parse(user.passwordHistory as string);
      for (const entry of history) {
        if (await bcrypt.compare(dto.newPassword, entry.password)) {
          throw new BadRequestException('You cannot reuse a recent password');
        }
      }
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const newVersion = user.passwordVersion + 1;

    const history: Array<{ password: string; changedAt: string }> = user.passwordHistory
      ? JSON.parse(user.passwordHistory as string)
      : [];
    history.push({ password: passwordHash, changedAt: new Date().toISOString() });
    if (history.length > 10) history.shift();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        passwordVersion: newVersion,
        passwordHistory: JSON.stringify(history),
        otp: null,
        otpExpiry: null,
        otpAttempts: 0,
      },
    });

    // Revoke all sessions except current
    await this.sessionService.revokeAllUserSessions(user.id);

    await this.auditService.log({
      action: 'PASSWORD_CHANGE',
      organizationId: user.organizationId ?? undefined,
      userId: user.id,
      metadata: { passwordVersion: newVersion },
    });

    await this.mailService.sendPasswordResetConfirmation(user.email);
    return { message: 'Password reset successfully. All other sessions have been logged out.' };
  }

  private orgId(user: { organization?: { id?: string | null } | null; organizationId?: string | null }): string | undefined {
    return (user.organization?.id ?? user.organizationId) ?? undefined;
  }

  private generateOtp(): string {
    return randomBytes(3).toString('hex').slice(0, 6).toUpperCase();
  }

  private parseBrowser(ua?: string): string | undefined {
    if (!ua) return undefined;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private parseOS(ua?: string): string | undefined {
    if (!ua) return undefined;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }
}
