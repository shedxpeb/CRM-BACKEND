import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrandingService } from './branding.service';
import { MailQueueService, MailJob } from './mail-queue.service';
import { buildMailTemplate, MailTemplateId, TemplateVars } from './template.engine';
import { buildMailHeaders, formatFromAddress } from './mail.headers';
import { MailTransportService } from './mail.transport';
import { MailTemplateUnavailableException } from './mail.exceptions';
import type { MailHealthSnapshot, SmtpFailureType } from './mail.types';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly branding: BrandingService,
    private readonly queue: MailQueueService,
    private readonly transport: MailTransportService,
  ) {}

  async onModuleInit() {
    this.queue.setSender((job) => this.deliver(job));
  }

  /** Backward-compatible readiness flag used by OTP/health callers. */
  isSmtpReady(): boolean {
    return this.transport.isReady();
  }

  getSmtpFailureType(): SmtpFailureType | null {
    return this.transport.getFailureType();
  }

  getMailHealth(): MailHealthSnapshot {
    return this.transport.getHealth(this.queue.getPendingCount());
  }

  getQueueSnapshot() {
    return {
      pending: this.queue.getPendingCount(),
      enabled: this.config.get<boolean>('mail.queueEnabled') !== false,
    };
  }

  async sendTemplate(
    to: string,
    templateId: MailTemplateId,
    vars: TemplateVars = {},
    organizationId?: string | null,
  ): Promise<void> {
    const job = await this.buildTemplateJob(to, templateId, vars, organizationId);
    this.queue.enqueue(job);
  }

  /**
   * Delivers a security-sensitive message synchronously. Nodemailer resolving
   * means the configured SMTP server accepted responsibility for delivery.
   */
  async sendTemplateNow(
    to: string,
    templateId: MailTemplateId,
    vars: TemplateVars = {},
    organizationId?: string | null,
    context: Pick<MailJob, 'requestId' | 'purpose'> = {},
  ): Promise<void> {
    const job = await this.buildTemplateJob(to, templateId, vars, organizationId, context);
    await this.deliver({ ...job, id: `mail_sync_${Date.now()}`, attempts: 0 });
  }

  private async buildTemplateJob(
    to: string,
    templateId: MailTemplateId,
    vars: TemplateVars = {},
    organizationId?: string | null,
    context: Pick<MailJob, 'requestId' | 'purpose'> = {},
  ): Promise<Omit<MailJob, 'id' | 'attempts'>> {
    const brand = await this.branding.resolve(organizationId);
    const merged: TemplateVars = {
      companyName: brand.companyName,
      companyLogo: brand.companyLogo,
      primaryColor: brand.primaryColor,
      supportEmail: brand.supportEmail,
      website: brand.website,
      address: brand.address,
      phone: brand.phone,
      year: brand.year,
      linkedin: brand.socialLinks.linkedin,
      twitter: brand.socialLinks.twitter,
      facebook: brand.socialLinks.facebook,
      ...vars,
      email: (vars.email as string) || to,
    };

    const built = buildMailTemplate(templateId, merged);
    if (!built.text?.trim() || !built.html?.trim()) {
      this.logger.error(`Template ${templateId} missing text or html — refusing to queue incomplete message`);
      throw new MailTemplateUnavailableException();
    }

    const nodeEnv = this.config.get<string>('nodeEnv') || 'development';
    const health = this.getMailHealth();
    if (nodeEnv === 'production' && !this.transport.canDeliver()) {
      this.logger.error(
        `Mail unavailable for transactional message ${JSON.stringify({
          ...this.transport.getConfigSnapshot(),
          requestId: context.requestId || null,
          purpose: context.purpose || null,
          recipient: to,
          templateId,
          smtpReady: false,
          failureType: health.failureType || 'SMTP_UNKNOWN',
          state: health.state,
        })}`,
      );
      throw new ServiceUnavailableException('Email delivery is temporarily unavailable');
    }

    return {
      to,
      subject: built.subject,
      text: built.text,
      html: built.html,
      templateId,
      ...context,
    };
  }

  async sendOtpEmail(
    email: string,
    otp: string,
    purpose: 'registration' | 'forgot-password',
    organizationId?: string,
  ): Promise<void> {
    const expiryMinutes = this.config.get<number>('otp.expiryMinutes') || 10;
    const templateId: MailTemplateId = purpose === 'registration' ? 'register_otp' : 'forgot_password_otp';
    await this.sendTemplate(
      email,
      templateId,
      { otp, expiry: `${expiryMinutes} minutes`, email },
      organizationId,
    );
  }

  async sendWelcomeEmail(email: string, name: string, organizationId?: string): Promise<void> {
    const frontend = this.config.get<string>('frontendUrl') || '';
    await this.sendTemplate(email, 'welcome', { userName: name, loginLink: frontend, email }, organizationId);
  }

  async sendPasswordResetConfirmation(email: string, name?: string, organizationId?: string): Promise<void> {
    await this.sendTemplate(email, 'reset_password_success', { userName: name || 'there', email }, organizationId);
  }

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
    const plain = text?.trim() || (html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '');
    if (!plain) {
      this.logger.error('Refusing to send email without plain-text body');
      return;
    }
    this.queue.enqueue({
      to,
      subject,
      text: plain,
      html: html || undefined,
    });
  }

  private async deliver(job: MailJob): Promise<void> {
    if (!this.transport.canDeliver()) {
      const nodeEnv = this.config.get<string>('nodeEnv') || 'development';
      this.logger.error(
        `Mail transport not ready ${JSON.stringify({
          requestId: job.requestId || null,
          purpose: job.purpose || null,
          recipient: job.to,
          templateId: job.templateId || null,
          deliveryChannel: this.transport.getDeliveryChannel(),
          failureType: this.transport.getFailureType() || 'SMTP_NOT_CONFIGURED',
          state: this.getMailHealth().state,
        })}`,
      );
      if (nodeEnv === 'production') {
        throw new ServiceUnavailableException('Email delivery is not configured');
      }
      return;
    }

    const fromName = this.config.get<string>('smtp.fromName') || this.config.get<string>('branding.companyName') || 'Account';
    const fromEmail =
      this.config.get<string>('mail.resendFromEmail') ||
      this.config.get<string>('smtp.fromEmail') ||
      this.config.get<string>('smtp.user') ||
      '';
    const supportEmail =
      this.config.get<string>('branding.supportEmail') ||
      fromEmail;
    const appName = this.config.get<string>('branding.companyName') || 'App';
    const channel = this.transport.getDeliveryChannel();

    if (!fromEmail) {
      this.logger.error('FROM email missing (SMTP_FROM_EMAIL / RESEND_FROM_EMAIL) — cannot deliver');
      throw new ServiceUnavailableException('Email delivery is unavailable. Try again later.');
    }

    if (!job.text?.trim()) {
      this.logger.error(`Missing plain-text body for ${job.to} — aborting send`);
      throw new ServiceUnavailableException('Email delivery is unavailable. Try again later.');
    }

    const headers = buildMailHeaders({
      fromName,
      fromEmail,
      to: job.to,
      replyTo: supportEmail || fromEmail,
      subject: job.subject,
      appName,
    });

    const startedAt = Date.now();
    const health = this.getMailHealth();
    this.logger.log(
      `Mail send started ${JSON.stringify({
        requestId: job.requestId || null,
        purpose: job.purpose || null,
        recipient: job.to,
        templateId: job.templateId || null,
        deliveryChannel: channel,
        smtpReady: this.transport.isReady(),
        state: health.state,
        failureType: health.failureType,
        provider: health.provider,
      })}`,
    );

    try {
      const result = await this.transport.sendMail({
        from: formatFromAddress(fromName, fromEmail),
        to: job.to,
        subject: job.subject,
        text: job.text,
        html: job.html && job.html.trim() ? job.html : undefined,
        replyTo: supportEmail || fromEmail,
        headers: channel === 'smtp' ? headers : undefined,
        date: new Date(),
        priority: 'normal',
      });

      if (!result.accepted?.length) {
        this.logger.error(
          `Mail send rejected ${JSON.stringify({
            requestId: job.requestId || null,
            purpose: job.purpose || null,
            recipient: job.to,
            templateId: job.templateId || null,
            deliveryChannel: channel,
            failureType: 'SMTP_PROVIDER_REJECTED',
            messageId: result.messageId,
            elapsedMs: Date.now() - startedAt,
          })}`,
        );
        throw new ServiceUnavailableException('Mail provider did not accept the email for delivery');
      }

      this.logger.log(
        `Mail send accepted ${JSON.stringify({
          requestId: job.requestId || null,
          purpose: job.purpose || null,
          recipient: job.to,
          templateId: job.templateId || null,
          deliveryChannel: channel,
          messageId: result.messageId,
          elapsedMs: Date.now() - startedAt,
        })}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Mail send failed ${JSON.stringify({
          requestId: job.requestId || null,
          purpose: job.purpose || null,
          recipient: job.to,
          templateId: job.templateId || null,
          deliveryChannel: channel,
          elapsedMs: Date.now() - startedAt,
          failureType: this.transport.getFailureType() || 'SMTP_UNKNOWN',
          state: this.getMailHealth().state,
          errorName: error instanceof Error ? error.name : typeof error,
        })}`,
      );
      throw error;
    }
  }
}
