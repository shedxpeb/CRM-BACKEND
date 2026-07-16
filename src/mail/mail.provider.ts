import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getMailTransportSnapshot, resolveMailProvider } from './mail.config';
import type { MailProviderName } from './mail.types';

/**
 * Provider factory — switches by MAIL_PROVIDER only.
 * Current implementation uses SMTP transport for all providers that expose SMTP.
 * SES/SendGrid/Mailgun can later return native SDK transporters without changing callers.
 */
@Injectable()
export class MailProviderFactory {
  constructor(private readonly config: ConfigService) {}

  getProviderName(): MailProviderName {
    return resolveMailProvider(this.config);
  }

  createTransporter(): Transporter {
    const snapshot = getMailTransportSnapshot(this.config);
    const provider = snapshot.provider;
    const host = this.resolveHost(provider, snapshot.host);
    const port = snapshot.port;
    const secure = snapshot.secure;

    if (!host || !snapshot.smtpUserExists || !snapshot.smtpPassExists) {
      throw new Error('SMTP credentials are incomplete for the configured mail provider');
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: this.config.get<string>('smtp.user'),
        pass: this.config.get<string>('smtp.pass'),
      },
      pool: snapshot.pool,
      maxConnections: this.config.get<number>('smtp.maxConnections') || 5,
      maxMessages: this.config.get<number>('smtp.maxMessages') || 100,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
      family: 4,
    } as nodemailer.TransportOptions);
  }

  private resolveHost(provider: MailProviderName, configuredHost: string | null): string | null {
    if (configuredHost) return configuredHost;
    switch (provider) {
      case 'gmail':
        return 'smtp.gmail.com';
      case 'zoho':
        return 'smtp.zoho.com';
      case 'microsoft365':
        return 'smtp.office365.com';
      case 'smtp':
      case 'ses':
      case 'sendgrid':
      case 'mailgun':
      default:
        return configuredHost;
    }
  }
}
