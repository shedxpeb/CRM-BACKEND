import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import {
  ResetPasswordDto,
  ResendOtpDto,
  ChangePasswordDto,
  ChangeEmailDto,
  VerifyChangeEmailDto,
  SendEmailVerificationDto,
  SendRegistrationOtpDto,
  SendForgotPasswordOtpDto,
  VerifyForgotPasswordOtpDto,
  VerifyEmailDto,
} from './dto/auth-extended.dto';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { AuditService } from './services/audit.service';
import { LoginProtectionService } from './services/login-protection.service';
import { OtpService, OtpPurposeKey } from './services/otp.service';
import { PermissionInheritanceService } from '../permissions/permission-inheritance.service';
import { bootstrapOrganizationSystem } from '../common/system-bootstrap';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mailService: MailService,
    private tokenService: TokenService,
    private sessionService: SessionService,
    private auditService: AuditService,
    private loginProtection: LoginProtectionService,
    private otpService: OtpService,
    private permissionInheritance: PermissionInheritanceService,
  ) {}

  private bcryptRounds() {
    return this.config.get<number>('security.bcryptRounds') || 12;
  }

  private accessExpiresSeconds() {
    const raw = this.config.get<string>('jwt.accessExpiresIn') || '30m';
    if (raw.endsWith('m')) return parseInt(raw, 10) * 60;
    if (raw.endsWith('h')) return parseInt(raw, 10) * 3600;
    if (raw.endsWith('d')) return parseInt(raw, 10) * 86400;
    return parseInt(raw, 10) || 1800;
  }

  private orgId(user: {
    organization?: { id?: string | null } | null;
    organizationId?: string | null;
  }) {
    return user.organization?.id ?? user.organizationId ?? undefined;
  }

  private refreshExpiryDays(rememberMe: boolean) {
    return rememberMe
      ? this.config.get<number>('session.rememberMeDays') || 30
      : this.config.get<number>('session.absoluteDays') || 1;
  }

  private async issueSessionTokens(
    user: any,
    opts: {
      ipAddress?: string;
      userAgent?: string;
      rememberMe?: boolean;
      auditAction?: string;
      auditMeta?: any;
    },
  ) {
    const device = opts.userAgent?.split(' ')[0];
    const browser = this.parseBrowser(opts.userAgent);
    const os = this.parseOS(opts.userAgent);

    const session = await this.sessionService.createSession({
      userId: user.id,
      organizationId: this.orgId(user),
      device,
      browser,
      os,
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
      isRememberMe: opts.rememberMe || false,
    });

    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: this.orgId(user),
      sessionId: session.id,
      passwordVersion: user.passwordVersion,
    });

    const refresh = this.tokenService.generateRefreshToken();
    const days = this.refreshExpiryDays(!!opts.rememberMe);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: refresh.hash,
        sessionId: session.id,
        userId: user.id,
        organizationId: this.orgId(user),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });
    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: refresh.hash },
    });

    await this.auditService.log({
      action: opts.auditAction || 'LOGIN',
      organizationId: this.orgId(user),
      userId: user.id,
      sessionId: session.id,
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
      metadata: opts.auditMeta || { device, browser, os, rememberMe: opts.rememberMe },
    });

    return {
      message: 'Authenticated successfully.',
      accessToken,
      refreshToken: refresh.token,
      sessionId: session.id,
      expiresIn: this.accessExpiresSeconds(),
      rememberMe: opts.rememberMe || false,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationType: user.organizationType,
        organizationId: this.orgId(user),
        organizationName: user.organization?.name,
      },
      mustChangePassword: user.mustChangePassword,
    };
  }

  async register(dto: RegisterDto, requestId?: string) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingUser) {
      if (existingUser.isVerified)
        throw new BadRequestException('An account with this email already exists');
      const otp = await this.otpService.issue({
        email: existingUser.email,
        purpose: 'REGISTRATION',
        userId: existingUser.id,
        userName: existingUser.name || undefined,
        organizationId: existingUser.organizationId,
        isResend: true,
        requestId,
      });
      return {
        message: 'Your account is awaiting email verification. A new OTP has been sent.',
        email: existingUser.email,
        ...otp,
      };
    }

    if (dto.companyName) {
      const existingOrg = await this.prisma.organization.findFirst({
        where: { name: dto.companyName, isDeleted: false },
      });
      if (existingOrg)
        throw new BadRequestException('An organization with this name already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds());
    const email = dto.email.toLowerCase();

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: dto.companyName || `${email.split('@')[0]} Organization` },
      });

      const user = await tx.user.create({
        data: {
          email,
          name: dto.name || email.split('@')[0],
          password: passwordHash,
          role: 'OWNER',
          organizationType: 'COMPANY',
          organizationId: organization.id,
          passwordHistory: JSON.stringify([
            { password: passwordHash, changedAt: new Date().toISOString() },
          ]),
        },
      });

      await bootstrapOrganizationSystem(tx, organization.id, user.id);

      return { organization, user };
    });

    const otp = await this.otpService.issue({
      email,
      purpose: 'REGISTRATION',
      userId: result.user.id,
      userName: result.user.name || undefined,
      organizationId: result.organization.id,
      requestId,
    });

    await this.auditService.log({
      action: 'auth.register',
      organizationId: result.organization.id,
      userId: result.user.id,
      metadata: { email },
    });

    return {
      message: 'Account created. Please verify your email with the OTP sent.',
      email,
      ...otp,
    };
  }

  async sendRegistrationOtp(dto: SendRegistrationOtpDto, requestId?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) throw new BadRequestException('No account found with this email');
    if (user.isVerified) throw new BadRequestException('Email already verified.');

    const otp = await this.otpService.issue({
      email: user.email,
      purpose: 'REGISTRATION',
      userId: user.id,
      userName: user.name || undefined,
      organizationId: user.organizationId,
      requestId,
    });

    return { message: 'OTP sent successfully.', email: user.email, ...otp };
  }

  async verifyRegistrationOtp(
    dto: VerifyOtpDto | VerifyRegistrationOtpDtoLike,
    ip?: string,
    ua?: string,
  ) {
    const email = dto.email.toLowerCase();
    await this.otpService.verify({ email, purpose: 'REGISTRATION', code: dto.otp });

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });
    if (!user) throw new BadRequestException('No account found with this email');
    if (user.isVerified) throw new BadRequestException('Email already verified.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, isActive: true, otp: null, otpExpiry: null, otpAttempts: 0 },
    });

    await this.mailService.sendWelcomeEmail(
      user.email,
      user.name || user.email,
      user.organizationId || undefined,
    );
    await this.auditService.log({
      action: 'auth.verify-registration-otp',
      organizationId: this.orgId(user),
      userId: user.id,
      ipAddress: ip,
      userAgent: ua,
    });

    return this.issueSessionTokens(user, {
      ipAddress: ip,
      userAgent: ua,
      auditAction: 'LOGIN',
      auditMeta: { method: 'registration_otp' },
    });
  }

  // ─── LOGIN / REFRESH / LOGOUT ─────────────────────────

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      await this.loginProtection.recordAttempt({
        email,
        success: false,
        failureReason: 'User not found',
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const lockStatus = await this.loginProtection.isLocked(email);
    if (lockStatus.locked) {
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        organizationId: this.orgId(user),
        userId: user.id,
        ipAddress,
        userAgent,
        metadata: { reason: 'Account locked', lockedUntil: lockStatus.lockedUntil },
      });
      throw new ForbiddenException('Account is temporarily locked. Try again later.');
    }

    if (!user.isActive || !user.isVerified) {
      throw new UnauthorizedException('Account is not active. Please verify your email.');
    }
    if (user.isLocked)
      throw new ForbiddenException('Account has been locked. Contact your administrator.');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      await this.loginProtection.recordAttempt({
        email,
        organizationId: this.orgId(user),
        success: false,
        failureReason: 'Invalid password',
        ipAddress,
        userAgent,
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

    await this.loginProtection.recordAttempt({
      email,
      organizationId: this.orgId(user),
      success: true,
      ipAddress,
      userAgent,
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });

    return this.issueSessionTokens(user, {
      ipAddress,
      userAgent,
      rememberMe: dto.rememberMe || false,
    });
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);

    return this.prisma
      .$transaction(
        async (tx) => {
          // Use Prisma findUnique with row-level lock to prevent concurrent rotation
          const storedToken = await tx.refreshToken.findUnique({
            where: { tokenHash },
            include: { session: true, user: true },
          });

          if (!storedToken) {
            this.logger.warn(`Refresh rejected: token not found in DB`);
            throw new UnauthorizedException('Invalid refresh token');
          }

          // If token already revoked with a replacement, resolve the successor family
          if (storedToken.isRevoked && storedToken.replacedByTokenHash) {
            const current = await tx.refreshToken.findUnique({
              where: { tokenHash: storedToken.replacedByTokenHash },
              include: { session: true, user: true },
            });
            if (
              current &&
              !current.isRevoked &&
              current.sessionId === storedToken.sessionId &&
              !current.session.isRevoked &&
              new Date() <= current.session.expiresAt
            ) {
              // Successor token is valid — rotate from it
              return this.issueRotatedRefresh(current, ipAddress, userAgent);
            }
            // Successor is also revoked/invalid — treat as true reuse/theft
            if (!current || current.isRevoked) {
              // Revoke all sessions for the user via raw SQL within transaction
              await tx.$executeRawUnsafe(
                'UPDATE "Session" SET "isRevoked" = true, "revokedAt" = NOW() WHERE "userId" = $1 AND "isRevoked" = false',
                storedToken.userId,
              );
              throw new UnauthorizedException('Refresh token has been revoked');
            }
          }

          // If token is actively valid, perform single atomic rotation
          if (!storedToken.isRevoked && new Date() <= storedToken.expiresAt) {
            // Double-check after lock acquisition (rows are already locked)
            const fresh = await tx.refreshToken.findUnique({
              where: { tokenHash: storedToken.tokenHash },
              include: { session: true, user: true },
            });

            if (
              !fresh ||
              fresh.isRevoked ||
              new Date() > fresh.expiresAt ||
              fresh.session.isRevoked ||
              new Date() > fresh.session.expiresAt ||
              new Date() > fresh.session.idleExpiresAt
            ) {
              // Token became invalid while waiting for lock
              if (fresh?.replacedByTokenHash) {
                const current = await tx.refreshToken.findUnique({
                  where: { tokenHash: fresh.replacedByTokenHash },
                  include: { session: true, user: true },
                });
                if (
                  current &&
                  !current.isRevoked &&
                  current.sessionId === fresh.sessionId &&
                  !current.session.isRevoked &&
                  new Date() <= current.session.expiresAt
                ) {
                  return this.issueRotatedRefresh(current, ipAddress, userAgent);
                }
              }
              throw new UnauthorizedException('Session has expired or been revoked');
            }
            return this.issueRotatedRefresh(fresh, ipAddress, userAgent);
          }

          // Token revoked without replacement (theft) or expired
          if (storedToken.isRevoked && !storedToken.replacedByTokenHash) {
            // Revoke all sessions for the user via raw SQL within transaction
            await tx.$executeRawUnsafe(
              'UPDATE "Session" SET "isRevoked" = true, "revokedAt" = NOW() WHERE "userId" = $1 AND "isRevoked" = false',
              storedToken.userId,
            );
            throw new UnauthorizedException('Refresh token has been revoked');
          }

          if (new Date() > storedToken.expiresAt) {
            throw new UnauthorizedException('Refresh token has expired');
          }

          throw new UnauthorizedException('Refresh token is not valid for rotation');
        },
        {
          timeout: 10_000,
        },
      )
      .catch((e) => {
        this.logger.error(`Refresh transaction error: ${e.message}`);
        throw new UnauthorizedException('Refresh token operation failed');
      });
  }

  private async issueRotatedRefresh(
    storedToken: {
      id: string;
      sessionId: string;
      userId: string;
      organizationId: string | null;
      session: { isRememberMe: boolean };
      user: {
        id: string;
        email: string;
        role: any;
        passwordVersion: number;
      };
    },
    ipAddress?: string,
    userAgent?: string,
  ) {
    const newRefresh = this.tokenService.generateRefreshToken();
    const days = this.refreshExpiryDays(storedToken.session.isRememberMe);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true, revokedAt: new Date(), replacedByTokenHash: newRefresh.hash },
      }),
      this.prisma.refreshToken.create({
        data: {
          tokenHash: newRefresh.hash,
          sessionId: storedToken.sessionId,
          userId: storedToken.userId,
          organizationId: storedToken.organizationId,
          expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        },
      }),
      this.prisma.session.update({
        where: { id: storedToken.sessionId },
        data: { refreshToken: newRefresh.hash, lastActivity: new Date() },
      }),
    ]);

    await this.sessionService.touchSession(storedToken.sessionId);

    const accessToken = this.tokenService.generateAccessToken({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
      organizationId: storedToken.organizationId ?? undefined,
      sessionId: storedToken.sessionId,
      passwordVersion: storedToken.user.passwordVersion,
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
      message: 'Token refreshed successfully.',
      accessToken,
      refreshToken: newRefresh.token,
      sessionId: storedToken.sessionId,
      expiresIn: this.accessExpiresSeconds(),
      rememberMe: storedToken.session.isRememberMe,
    };
  }

  async logout(sessionId: string, userId: string, ipAddress?: string, userAgent?: string) {
    await this.sessionService.revokeSession(sessionId);
    await this.auditService.log({ action: 'LOGOUT', userId, sessionId, ipAddress, userAgent });
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string, ip?: string, ua?: string) {
    await this.sessionService.revokeAllUserSessions(userId, exceptSessionId);
    await this.auditService.log({
      action: 'auth.revoke-all-sessions',
      userId,
      sessionId: exceptSessionId,
      ipAddress: ip,
      userAgent: ua,
    });
    await this.mailService
      .sendTemplate(
        (await this.prisma.user.findUnique({ where: { id: userId } }))!.email,
        'security_alert',
        {
          userName: 'there',
          alertMessage: 'All active sessions were signed out from your account.',
          ipAddress: ip,
          device: ua?.split(' ')[0],
          timestamp: new Date().toISOString(),
        },
      )
      .catch(() => undefined);
    return { message: 'All sessions have been revoked.' };
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
        mustChangePassword: true,
        lastLogin: true,
        createdAt: true,
        organization: { select: { name: true } },
      },
    });
    if (!user) throw new UnauthorizedException('User not found');

    let effectivePermissions: string[] = [];
    try {
      if (user.organizationId) {
        effectivePermissions = await this.permissionInheritance.getEffectivePermissions(
          userId,
          user.organizationId,
        );
      }
    } catch {
      effectivePermissions = [];
    }

    const { organization, ...rest } = user;
    return { ...rest, organizationName: organization?.name, permissions: effectivePermissions };
  }

  // ─── PASSWORD / EMAIL ─────────────────────────────────

  async sendForgotPasswordOtp(
    dto: ForgotPasswordDto | SendForgotPasswordOtpDto,
    requestId?: string,
  ) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'If an account exists for this email, an OTP has been sent.' };
    }

    const otp = await this.otpService.issue({
      email,
      purpose: 'FORGOT_PASSWORD',
      userId: user.id,
      userName: user.name || undefined,
      organizationId: user.organizationId,
      requestId,
    });

    await this.auditService.log({
      action: 'auth.send-forgot-password-otp',
      organizationId: user.organizationId ?? undefined,
      userId: user.id,
      metadata: { email },
    });

    return { message: 'If an account exists for this email, an OTP has been sent.', email, ...otp };
  }

  async verifyForgotPasswordOtp(dto: VerifyForgotPasswordOtpDto) {
    await this.otpService.verify({
      email: dto.email.toLowerCase(),
      purpose: 'FORGOT_PASSWORD',
      code: dto.otp,
    });
    return { message: 'OTP verified successfully.', email: dto.email.toLowerCase() };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const email = dto.email.toLowerCase();
    await this.otpService.verify({
      email,
      purpose: 'FORGOT_PASSWORD',
      code: dto.otp,
      consume: true,
    });

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('No account found with this email');

    await this.ensurePasswordNotReused(user, dto.newPassword);
    const passwordHash = await bcrypt.hash(dto.newPassword, this.bcryptRounds());
    const newVersion = user.passwordVersion + 1;
    const history = this.pushPasswordHistory(user.passwordHistory, passwordHash);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        passwordVersion: newVersion,
        passwordHistory: JSON.stringify(history),
        mustChangePassword: false,
        otp: null,
        otpExpiry: null,
        otpAttempts: 0,
      },
    });

    await this.sessionService.revokeAllUserSessions(user.id);
    await this.auditService.log({
      action: 'PASSWORD_CHANGE',
      organizationId: user.organizationId ?? undefined,
      userId: user.id,
      metadata: { passwordVersion: newVersion, method: 'forgot_password' },
    });
    await this.mailService.sendPasswordResetConfirmation(
      user.email,
      user.name || undefined,
      user.organizationId || undefined,
    );

    return { message: 'Password reset successfully. All other sessions have been logged out.' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ip?: string, ua?: string) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const ok = await bcrypt.compare(dto.currentPassword, user.password);
    if (!ok) throw new BadRequestException('Current password is incorrect');

    await this.ensurePasswordNotReused(user, dto.newPassword);
    const passwordHash = await bcrypt.hash(dto.newPassword, this.bcryptRounds());
    const newVersion = user.passwordVersion + 1;
    const history = this.pushPasswordHistory(user.passwordHistory, passwordHash);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: passwordHash,
        passwordVersion: newVersion,
        passwordHistory: JSON.stringify(history),
        mustChangePassword: false,
      },
    });

    await this.sessionService.revokeAllUserSessions(userId);
    await this.auditService.log({
      action: 'PASSWORD_CHANGE',
      organizationId: user.organizationId ?? undefined,
      userId,
      ipAddress: ip,
      userAgent: ua,
      metadata: { method: 'change_password' },
    });
    await this.mailService.sendTemplate(
      user.email,
      'password_changed',
      {
        userName: user.name || 'there',
        email: user.email,
      },
      user.organizationId,
    );

    return { message: 'Password changed successfully. Please sign in again.' };
  }

  async changeEmail(userId: string, dto: ChangeEmailDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new BadRequestException('Password is incorrect');

    const newEmail = dto.newEmail.toLowerCase();
    if (newEmail === user.email) throw new BadRequestException('New email must be different');

    const taken = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (taken) throw new BadRequestException('An account with this email already exists');

    const otp = await this.otpService.issue({
      email: newEmail,
      purpose: 'CHANGE_EMAIL',
      userId: user.id,
      userName: user.name || undefined,
      organizationId: user.organizationId,
      metadata: { previousEmail: user.email, pendingEmail: newEmail },
    });

    return { message: 'OTP sent successfully.', email: newEmail, ...otp };
  }

  async verifyChangeEmail(userId: string, dto: VerifyChangeEmailDto, ip?: string, ua?: string) {
    const newEmail = dto.newEmail.toLowerCase();
    await this.otpService.verify({ email: newEmail, purpose: 'CHANGE_EMAIL', code: dto.otp });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const taken = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (taken && taken.id !== userId) {
      throw new BadRequestException('An account with this email already exists');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail, isVerified: true },
    });

    await this.sessionService.revokeAllUserSessions(userId);
    await this.auditService.log({
      action: 'auth.change-email',
      organizationId: user.organizationId ?? undefined,
      userId,
      ipAddress: ip,
      userAgent: ua,
      metadata: { from: user.email, to: newEmail },
    });

    return { message: 'Email changed successfully. Please sign in again.', email: newEmail };
  }

  async sendEmailVerification(userId: string, dto?: SendEmailVerificationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.isVerified && (!dto?.email || dto.email.toLowerCase() === user.email)) {
      throw new BadRequestException('Email already verified.');
    }

    const email = (dto?.email || user.email).toLowerCase();
    const otp = await this.otpService.issue({
      email,
      purpose: 'EMAIL_VERIFICATION',
      userId: user.id,
      userName: user.name || undefined,
      organizationId: user.organizationId,
    });
    return { message: 'OTP sent successfully.', email, ...otp };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const email = dto.email.toLowerCase();
    await this.otpService.verify({ email, purpose: 'EMAIL_VERIFICATION', code: dto.otp });
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('No account found with this email');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, isActive: true },
    });

    await this.auditService.log({
      action: 'auth.verify-email',
      organizationId: user.organizationId ?? undefined,
      userId: user.id,
    });

    return { message: 'Email verified successfully.', email };
  }

  async resendOtp(dto: ResendOtpDto, requestId?: string) {
    const email = dto.email.toLowerCase();
    const purpose = (dto.purpose || 'REGISTRATION') as OtpPurposeKey;
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (purpose === 'REGISTRATION') {
      if (!user) throw new BadRequestException('No account found with this email');
      if (user.isVerified) throw new BadRequestException('Email already verified.');
    }
    if (purpose === 'FORGOT_PASSWORD' && !user) {
      return { message: 'If an account exists for this email, an OTP has been sent.' };
    }

    const otp = await this.otpService.issue({
      email,
      purpose,
      userId: user?.id,
      userName: user?.name || undefined,
      organizationId: user?.organizationId,
      isResend: true,
      requestId,
    });

    return { message: 'OTP sent successfully.', email, ...otp };
  }

  // Aliases used by legacy routes
  async verifyOtp(dto: VerifyOtpDto, ip?: string, ua?: string) {
    return this.verifyRegistrationOtp(dto, ip, ua);
  }

  async forgotPassword(dto: ForgotPasswordDto, requestId?: string) {
    return this.sendForgotPasswordOtp(dto, requestId);
  }

  private async ensurePasswordNotReused(user: { passwordHistory: unknown }, newPassword: string) {
    if (!user.passwordHistory) return;
    const history: Array<{ password: string }> =
      typeof user.passwordHistory === 'string'
        ? JSON.parse(user.passwordHistory as string)
        : (user.passwordHistory as Array<{ password: string }>);
    for (const entry of history || []) {
      if (await bcrypt.compare(newPassword, entry.password)) {
        throw new BadRequestException('You cannot reuse a recent password');
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pushPasswordHistory(existing: any, passwordHash: string) {
    const size = this.config.get<number>('security.passwordHistorySize') || 10;
    const history: Array<{ password: string; changedAt: string }> = existing
      ? typeof existing === 'string'
        ? JSON.parse(existing)
        : existing
      : [];
    history.push({ password: passwordHash, changedAt: new Date().toISOString() });
    while (history.length > size) history.shift();
    return history;
  }

  private parseBrowser(ua?: string): string | undefined {
    if (!ua) return undefined;
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return 'Unknown';
  }

  private parseOS(ua?: string): string | undefined {
    if (!ua) return undefined;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  }
}

type VerifyRegistrationOtpDtoLike = { email: string; otp: string };
