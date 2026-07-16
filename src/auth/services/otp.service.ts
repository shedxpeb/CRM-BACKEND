import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
  }): Promise<{ expiresInMinutes: number; resendAvailableInSeconds?: number }> {
    const email = params.email.toLowerCase().trim();
    const purpose = params.purpose as OtpPurpose;

    const active = await this.prisma.otpChallenge.findFirst({
      where: { email, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (active) {
      const sinceLast = (Date.now() - active.lastSentAt.getTime()) / 1000;
      if (sinceLast < this.resendCooldown()) {
        const wait = Math.ceil(this.resendCooldown() - sinceLast);
        throw new BadRequestException(`Please wait ${wait} second(s) before requesting another OTP.`);
      }
      if (active.resendCount >= active.maxResends) {
        throw new BadRequestException('Maximum OTP resend limit exceeded. Please try again later.');
      }
    }

    // Invalidate previous active challenges for this purpose
    await this.prisma.otpChallenge.updateMany({
      where: { email, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, this.rounds());
    const expiresAt = new Date(Date.now() + this.expiryMinutes() * 60 * 1000);
    const resendCount = active ? active.resendCount + 1 : 0;

    await this.prisma.otpChallenge.create({
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

    // Clear legacy plaintext OTP fields if present
    if (params.userId) {
      await this.prisma.user.update({
        where: { id: params.userId },
        data: { otp: null, otpExpiry: null, otpAttempts: 0 },
      }).catch(() => undefined);
    }

    await this.mail.sendTemplate(
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

    this.logger.log(`OTP issued for ${email} purpose=${params.purpose}`);
    return { expiresInMinutes: this.expiryMinutes() };
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

    if (!challenge) throw new BadRequestException('No OTP has been sent.');
    if (new Date() > challenge.expiresAt) throw new BadRequestException('OTP expired.');
    if (challenge.attempts >= challenge.maxAttempts) {
      throw new BadRequestException('Maximum attempts exceeded.');
    }

    const ok = await bcrypt.compare(params.code.trim(), challenge.codeHash);
    if (!ok) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = challenge.maxAttempts - (challenge.attempts + 1);
      throw new BadRequestException(
        remaining > 0 ? `Invalid OTP. ${remaining} attempt(s) remaining.` : 'Invalid OTP. Maximum attempts exceeded.',
      );
    }

    if (consume) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
    }

    const metadata =
      challenge.metadata && typeof challenge.metadata === 'object' && !Array.isArray(challenge.metadata)
        ? (challenge.metadata as Record<string, unknown>)
        : null;

    return { challengeId: challenge.id, metadata, userId: challenge.userId };
  }
}
