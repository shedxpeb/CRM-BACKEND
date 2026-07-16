import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { BrandingService } from './branding.service';
import { MailQueueService, MailJob } from './mail-queue.service';
import { buildMailTemplate, MailTemplateId, TemplateVars } from './template.engine';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private smtpReady = false;

  constructor(
    private readonly config: ConfigService,
    private readonly branding: BrandingService,
    private readonly queue: MailQueueService,
  ) {}

  async onModuleInit() {
    this.queue.setSender((job) => this.deliver(job));
    await this.initTransporter();
  }

  private async initTransporter() {
    const host = this.config.get<string>('smtp.host');
    const user = this.config.get<string>('smtp.user');
    const pass = this.config.get<string>('smtp.pass');
    const port = this.config.get<number>('smtp.port') || 587;
    const secure = this.config.get<boolean>('smtp.secure') === true || port === 465;

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not fully configured — emails will be queued/logged but may not deliver');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      pool: this.config.get<boolean>('smtp.pool') !== false,
      maxConnections: this.config.get<number>('smtp.maxConnections') || 5,
      maxMessages: this.config.get<number>('smtp.maxMessages') || 100,
      connectionTimeout: 15000,
      socketTimeout: 15000,
      family: 4,
    } as any);

    if (this.config.get<boolean>('smtp.verifyOnBoot') !== false) {
      try {
        await this.transporter.verify();
        this.smtpReady = true;
        this.logger.log(`SMTP verified (${host}:${port})`);
      } catch (err: any) {
        this.smtpReady = false;
        this.logger.error(`SMTP verification failed — app will continue. ${err?.message || err}`);
      }
    } else {
      this.smtpReady = true;
    }
  }

  async sendTemplate(
    to: string,
    templateId: MailTemplateId,
    vars: TemplateVars = {},
    organizationId?: string | null,
  ): Promise<void> {
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
    this.queue.enqueue({
      to,
      subject: built.subject,
      text: built.text,
      html: built.html,
    });
  }

  /** @deprecated use sendTemplate — kept for gradual migration */
  async sendOtpEmail(email: string, otp: string, purpose: 'registration' | 'forgot-password', organizationId?: string): Promise<void> {
    const expiryMinutes = this.config.get<number>('otp.expiryMinutes') || 10;
    const templateId: MailTemplateId = purpose === 'registration' ? 'register_otp' : 'forgot_password_otp';
    await this.sendTemplate(email, templateId, { otp, expiry: `${expiryMinutes} minutes`, email }, organizationId);
  }

  async sendWelcomeEmail(email: string, name: string, organizationId?: string): Promise<void> {
    const frontend = this.config.get<string>('frontendUrl') || '';
    await this.sendTemplate(email, 'welcome', { userName: name, loginLink: frontend, email }, organizationId);
  }

  async sendPasswordResetConfirmation(email: string, name?: string, organizationId?: string): Promise<void> {
    await this.sendTemplate(email, 'reset_password_success', { userName: name || 'there', email }, organizationId);
  }

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
    this.queue.enqueue({ to, subject, text, html });
  }

  private async deliver(job: MailJob): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[MAIL-FALLBACK] To=${job.to} Subject=${job.subject}`);
      return;
    }

    const fromName = this.config.get<string>('smtp.fromName') || 'App';
    const fromEmail = this.config.get<string>('smtp.fromEmail') || this.config.get<string>('smtp.user');

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: job.to,
        subject: job.subject,
        text: job.text,
        html: job.html,
      });
      this.logger.log(`Email delivered to ${job.to}: ${job.subject}`);
    } catch (error: any) {
      this.logger.error(`Failed to deliver email to ${job.to}: ${error?.message || error}`);
      throw error;
    }
  }

  isSmtpReady(): boolean {
    return this.smtpReady;
  }
}
