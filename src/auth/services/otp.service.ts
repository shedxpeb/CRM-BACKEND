import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { MailTemplateId } from '../../mail/template.engine';

export type OtpPurposeKey =
  | 'REGISTRATION'
  | 'FORGOT_PASSWORD'
  | 'EMAIL_VERIFICATION'
  | 'CHANGE_EMAIL'
  | 'TWO_FACTOR'
  | 'ORGANIZATION_INVITE';

const PURPOSE_TEMPLATE: Record<OtpPurposeKey, MailTemplateId> = {
  REGISTRATION: 'register_otp',
  FORGOT_PASSWORD: 'forgot_password_otp',
  EMAIL_VERIFICATION: 'email_verification',
  CHANGE_EMAIL: 'email_verification',
  TWO_FACTOR: 'register_otp',
  ORGANIZATION_INVITE: 'organization_invitation',
};

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  private length() {
    return this.config.get<number>('otp.length') || 6;
  }
  private expiryMinutes() {
    return this.config.get<number>('otp.expiryMinutes') || 10;
  }
  private maxAttempts() {
    return this.config.get<number>('otp.maxAttempts') || 5;
  }
  private maxResends() {
    return this.config.get<number>('otp.maxResends') || 5;
  }
  private resendCooldown() {
    return this.config.get<number>('otp.resendCooldownSeconds') || 60;
  }
  private rounds() {
    return this.config.get<number>('otp.bcryptRounds') || 10;
  }

  /** Cryptographically secure numeric OTP */
  generateCode(): string {
    const len = this.length();
    let code = '';
    for (let i = 0; i < len; i++) {
      code += String(randomInt(0, 10));
    }
    return code;
  }

  async issue(params: {
    email: string;
    purpose: OtpPurposeKey;
    userId?: string;
    userName?: string;
    organizationId?: string | null;
    metadata?: Record<string, unknown>;
    isResend?: boolean;
  }): Promise<{ expiresAt: Date; expiresInMinutes: number; resendAvailableInSeconds: number; resendCount: number }> {
    const email = params.email.toLowerCase().trim();
    const purpose = params.purpose as OtpPurpose;

    const previous = await this.prisma.otpChallenge.findFirst({
      where: { email, purpose, consumedAt: null },
      orderBy: { lastSentAt: 'desc' },
    });

    if (previous) {
      const sinceLast = (Date.now() - previous.lastSentAt.getTime()) / 1000;
      if (sinceLast < this.resendCooldown()) {
        const wait = Math.ceil(this.resendCooldown() - sinceLast);
        throw new BadRequestException({
          message: `Please wait ${wait} second(s) before requesting another OTP.`,
          code: 'OTP_RESEND_COOLDOWN',
          retryAfterSeconds: wait,
        });
      }
      if (previous.resendCount >= previous.maxResends) {
        await this.audit('OTP_MAX_RESENDS_REACHED', params, { purpose: params.purpose });
        throw new BadRequestException({
          message: 'You have reached the maximum resend limit. Please try again later.',
          code: 'OTP_MAX_RESENDS_REACHED',
        });
      }
    }

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, this.rounds());
    const expiresAt = new Date(Date.now() + this.expiryMinutes() * 60 * 1000);
    const resendCount = previous ? previous.resendCount + 1 : 0;

    await this.audit('OTP_REQUESTED', params, { purpose: params.purpose, isResend: !!params.isResend });
    try {
      await this.mail.sendTemplateNow(
        email,
        PURPOSE_TEMPLATE[params.purpose],
        {
          userName: params.userName || email.split('@')[0],
          otp: code,
          expiry: `${this.expiryMinutes()} minutes`,
          email,
        },
        params.organizationId,
      );
    } catch {
      await this.audit('OTP_SEND_FAILED', params, { purpose: params.purpose });
      this.logger.error(`OTP email was not accepted by SMTP for purpose=${params.purpose}`);
      throw new ServiceUnavailableException("We couldn't send the verification code. Please try again.");
    }

    await this.prisma.$transaction(async (tx) => {
      // A resend always invalidates the preceding code after SMTP acceptance.
      await tx.otpChallenge.updateMany({
        where: { email, purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      });

      await tx.otpChallenge.create({
        data: {
          email,
          userId: params.userId,
          purpose,
          codeHash,
          expiresAt,
          maxAttempts: this.maxAttempts(),
          maxResends: this.maxResends(),
          resendCount,
          metadata: (params.metadata as any) || undefined,
        },
      });

      if (params.userId) {
        await tx.user.update({
          where: { id: params.userId },
          data: { otp: null, otpExpiry: null, otpAttempts: 0 },
        });
      }
    });

    await this.audit(params.isResend ? 'OTP_RESENT' : 'OTP_SENT', params, {
      purpose: params.purpose,
      resendCount,
      expiresAt: expiresAt.toISOString(),
    });
    return {
      expiresAt,
      expiresInMinutes: this.expiryMinutes(),
      resendAvailableInSeconds: this.resendCooldown(),
      resendCount,
    };
  }

  async verify(params: {
    email: string;
    purpose: OtpPurposeKey;
    code: string;
    consume?: boolean;
  }): Promise<{ challengeId: string; metadata: Record<string, unknown> | null; userId: string | null }> {
    const email = params.email.toLowerCase().trim();
    const purpose = params.purpose as OtpPurpose;
    const consume = params.consume !== false;

    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { email, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) throw new BadRequestException({ message: 'No OTP has been sent. Request a new OTP.', code: 'OTP_NOT_FOUND' });
    if (new Date() > challenge.expiresAt) {
      await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      await this.audit('OTP_EXPIRED', { email, purpose: params.purpose, userId: challenge.userId || undefined }, { purpose: params.purpose });
      throw new BadRequestException({ message: 'OTP expired. Request a new OTP.', code: 'OTP_EXPIRED' });
    }
    if (challenge.attempts >= challenge.maxAttempts) {
      await this.audit('OTP_MAX_ATTEMPTS_REACHED', { email, purpose: params.purpose, userId: challenge.userId || undefined }, { purpose: params.purpose });
      throw new BadRequestException({ message: 'Maximum attempts exceeded. Request a new OTP.', code: 'OTP_MAX_ATTEMPTS_REACHED', attemptsRemaining: 0 });
    }

    const ok = await bcrypt.compare(params.code.trim(), challenge.codeHash);
    if (!ok) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = challenge.maxAttempts - (challenge.attempts + 1);
      if (remaining === 0) {
        await this.audit('OTP_MAX_ATTEMPTS_REACHED', { email, purpose: params.purpose, userId: challenge.userId || undefined }, { purpose: params.purpose });
      } else {
        await this.audit('OTP_VERIFICATION_FAILED', { email, purpose: params.purpose, userId: challenge.userId || undefined }, { purpose: params.purpose, attemptsRemaining: remaining });
      }
      throw new BadRequestException({
        message: remaining > 0
          ? `Incorrect verification code. Attempts remaining: ${remaining}`
          : 'Incorrect verification code. Maximum attempts exceeded. Request a new OTP.',
        code: remaining > 0 ? 'OTP_INVALID' : 'OTP_MAX_ATTEMPTS_REACHED',
        attemptsRemaining: Math.max(0, remaining),
      });
    }

    if (consume) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
    }
    await this.audit('OTP_VERIFICATION_SUCCESS', { email, purpose: params.purpose, userId: challenge.userId || undefined }, { purpose: params.purpose });

    const metadata =
      challenge.metadata && typeof challenge.metadata === 'object' && !Array.isArray(challenge.metadata)
        ? (challenge.metadata as Record<string, unknown>)
        : null;

    return { challengeId: challenge.id, metadata, userId: challenge.userId };
  }

  private async audit(
    action: string,
    params: { userId?: string; organizationId?: string | null; email?: string; purpose?: OtpPurposeKey },
    metadata: Record<string, unknown>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          userId: params.userId,
          organizationId: params.organizationId || undefined,
          metadata: metadata as any,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to record OTP audit event: ${error?.message || error}`);
    }
  }
}
