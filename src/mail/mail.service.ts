import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('smtp.host');
    const user = this.configService.get<string>('smtp.user');
    const pass = this.configService.get<string>('smtp.pass');

    if (host && user) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('smtp.port'),
        secure: false,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
        socketTimeout: 10000,
        family: 4,
      } as any);
    } else {
      this.logger.warn('SMTP not configured — emails will be logged to console only');
    }
  }

  async sendOtpEmail(email: string, otp: string, purpose: 'registration' | 'forgot-password'): Promise<void> {
    const subject = purpose === 'registration'
      ? 'Verify your email address'
      : 'Reset your password';

    const text = `Your OTP is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you did not request this, please ignore this email.`;

    this.logger.log(`[DEV] OTP for ${email}: ${otp}`);
    await this.sendEmail(email, subject, text);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const subject = 'Welcome to PEB CRM';
    const text = `Welcome ${name}! Your account has been activated successfully.\n\nYou can now log in and start using PEB CRM.`;

    await this.sendEmail(email, subject, text);
  }

  async sendPasswordResetConfirmation(email: string): Promise<void> {
    const subject = 'Password reset successful';
    const text = 'Your password has been reset successfully.\n\nIf you did not make this change, please contact support immediately.';

    await this.sendEmail(email, subject, text);
  }

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(`[DEV] Email to ${to}: ${subject}`);
      return;
    }

    if (!this.transporter) {
      this.logger.log(`[DEV] Email to ${to}: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"PEB CRM" <${this.configService.get<string>('smtp.user')}>`,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
    }
  }
}
