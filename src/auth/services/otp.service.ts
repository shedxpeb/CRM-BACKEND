import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { MailTemplateId } from '../../mail/template.engine';
import {
  MailAuditJson,
  buildMailAuditMetadata,
  sanitizeMailAuditMetadata,
  toPrismaJson,
} from '../../mail/mail.policy';

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

  private providerName() {
    return this.mail.getMailHealth().provider || 'smtp';
  }

  /** Cryptographically secure numeric OTP — never persisted in plaintext. */
  generateCode(): string {
    const len = this.length();
    let code = '';
    for (let i = 0; i < len; i++) {
      code += String(randomInt(0, 10));
    }
    return code;
  }

  /** Remove expired and already-invalidated OTP rows. */
  async purgeStaleChallenges(email?: string, purpose?: OtpPurpose): Promise<void> {
    const where = {
      OR: [{ expiresAt: { lt: new Date() } }, { consumedAt: { not: null } }],
      ...(email ? { email } : {}),
      ...(purpose ? { purpose } : {}),
    };
    await this.prisma.otpChallenge.deleteMany({ where });
  }

  async issue(params: {
    email: string;
    purpose: OtpPurposeKey;
    userId?: string;
    userName?: string;
    organizationId?: string | null;
    metadata?: MailAuditJson;
    isResend?: boolean;
    requestId?: string;
  }): Promise<{ expiresAt: Date; expiresInMinutes: number; resendAvailableInSeconds: number; resendCount: number }> {
    const email = params.email.toLowerCase().trim();
    const purpose = params.purpose as OtpPurpose;

    await this.purgeStaleChallenges(email, purpose);

    const previous = await this.prisma.otpChallenge.findFirst({
      where: { email, purpose },
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
        await this.audit('OTP_MAX_RESENDS_REACHED', params, {
          purpose: params.purpose,
          status: 'FAILED',
        });
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

    await this.audit('OTP_REQUESTED', params, {
      purpose: params.purpose,
      status: 'PENDING',
      isResend: !!params.isResend,
    });

    try {
      await this.mail.sendTemplateNow(
        email,
        PURPOSE_TEMPLATE[params.purpose],
        {
          userName: params.userName || email.split('@')[0],
          otp: code,
          expiry: `${this.expiryMinutes()} minutes`,
          expiryMinutes: this.expiryMinutes(),
          email,
        },
        params.organizationId,
        { requestId: params.requestId, purpose: params.purpose },
      );
    } catch (error: unknown) {
      await this.audit('OTP_SEND_FAILED', params, {
        purpose: params.purpose,
        status: 'FAILED',
        failureType: this.mail.getSmtpFailureType(),
      });
      this.logger.error(
        `OTP_FAILED ${JSON.stringify({
          action: 'OTP_FAILED',
          requestId: params.requestId || null,
          purpose: params.purpose,
          provider: this.providerName(),
          status: 'FAILED',
          failureType: this.mail.getSmtpFailureType() || 'SMTP_UNKNOWN',
        })}`,
      );
      throw new ServiceUnavailableException("We couldn't send the verification code. Please try again.");
    }

    const safeMetadata = toPrismaJson(sanitizeMailAuditMetadata(params.metadata));

    await this.prisma.$transaction(async (tx) => {
      // Invalidate previous challenges by hard-delete — never keep used OTP hashes.
      await tx.otpChallenge.deleteMany({ where: { email, purpose } });

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
          metadata: safeMetadata,
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
      status: 'SUCCESS',
      resendCount,
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
  }): Promise<{ challengeId: string; metadata: MailAuditJson | null; userId: string | null }> {
    const email = params.email.toLowerCase().trim();
    const purpose = params.purpose as OtpPurpose;
    const consume = params.consume !== false;

    await this.purgeStaleChallenges(email, purpose);

    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { email, purpose },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new BadRequestException({ message: 'No OTP has been sent. Request a new OTP.', code: 'OTP_NOT_FOUND' });
    }

    if (new Date() > challenge.expiresAt) {
      await this.prisma.otpChallenge.delete({ where: { id: challenge.id } }).catch(() => undefined);
      await this.audit(
        'OTP_EXPIRED',
        { email, purpose: params.purpose, userId: challenge.userId || undefined },
        { purpose: params.purpose, status: 'FAILED' },
      );
      throw new BadRequestException({
        message: 'OTP has expired. Please request a new one.',
        code: 'OTP_EXPIRED',
      });
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      await this.prisma.otpChallenge.delete({ where: { id: challenge.id } }).catch(() => undefined);
      await this.audit(
        'OTP_MAX_ATTEMPTS_REACHED',
        { email, purpose: params.purpose, userId: challenge.userId || undefined },
        { purpose: params.purpose, status: 'FAILED' },
      );
      throw new BadRequestException({
        message: 'Maximum attempts exceeded. Request a new OTP.',
        code: 'OTP_MAX_ATTEMPTS_REACHED',
        attemptsRemaining: 0,
      });
    }

    const ok = await bcrypt.compare(params.code.trim(), challenge.codeHash);
    if (!ok) {
      const remaining = challenge.maxAttempts - (challenge.attempts + 1);
      if (remaining <= 0) {
        await this.prisma.otpChallenge.delete({ where: { id: challenge.id } }).catch(() => undefined);
        await this.audit(
          'OTP_MAX_ATTEMPTS_REACHED',
          { email, purpose: params.purpose, userId: challenge.userId || undefined },
          { purpose: params.purpose, status: 'FAILED' },
        );
      } else {
        await this.prisma.otpChallenge.update({
          where: { id: challenge.id },
          data: { attempts: { increment: 1 } },
        });
        await this.audit(
          'OTP_VERIFICATION_FAILED',
          { email, purpose: params.purpose, userId: challenge.userId || undefined },
          { purpose: params.purpose, status: 'FAILED', attemptsRemaining: remaining },
        );
      }
      throw new BadRequestException({
        message:
          remaining > 0
            ? `Incorrect verification code. Attempts remaining: ${remaining}`
            : 'Incorrect verification code. Maximum attempts exceeded. Request a new OTP.',
        code: remaining > 0 ? 'OTP_INVALID' : 'OTP_MAX_ATTEMPTS_REACHED',
        attemptsRemaining: Math.max(0, remaining),
      });
    }

    const metadata =
      challenge.metadata && typeof challenge.metadata === 'object' && !Array.isArray(challenge.metadata)
        ? sanitizeMailAuditMetadata(challenge.metadata as Record<string, unknown>)
        : null;
    const userId = challenge.userId;
    const challengeId = challenge.id;

    if (consume) {
      await this.prisma.otpChallenge.delete({ where: { id: challenge.id } });
    }

    await this.audit(
      'OTP_VERIFICATION_SUCCESS',
      { email, purpose: params.purpose, userId: userId || undefined },
      { purpose: params.purpose, status: 'SUCCESS' },
    );

    return { challengeId, metadata, userId };
  }

  private async audit(
    action: string,
    params: { userId?: string; organizationId?: string | null; email?: string; purpose?: OtpPurposeKey; requestId?: string },
    metadata: MailAuditJson,
  ) {
    try {
      const status =
        metadata.status === 'SUCCESS' || metadata.status === 'FAILED' || metadata.status === 'PENDING'
          ? metadata.status
          : undefined;
      await this.prisma.auditLog.create({
        data: {
          action,
          userId: params.userId,
          organizationId: params.organizationId || undefined,
          metadata: toPrismaJson(
            buildMailAuditMetadata({
              recipient: params.email,
              purpose: params.purpose,
              provider: this.providerName(),
              requestId: params.requestId,
              status,
              failureType: typeof metadata.failureType === 'string' ? metadata.failureType : null,
              extra: metadata,
            }),
          ),
        },
      });
    } catch (error: unknown) {
      this.logger.error(
        `OTP audit write failed ${JSON.stringify({
          action,
          status: 'FAILED',
          failureType: 'AUDIT_WRITE_FAILED',
        })}`,
      );
    }
  }
}
