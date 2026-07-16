import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getMailTransportSnapshot, resolveMailProvider, resolveSmtpIpFamily } from './mail.config';
import { resolveSmtpEndpoint } from './mail.dns';
import type { MailProviderName } from './mail.types';

/**
 * Provider factory — switches by MAIL_PROVIDER only.
 * Current implementation uses SMTP transport for all providers that expose SMTP.
 * SES/SendGrid/Mailgun can later return native SDK transporters without changing callers.
 */
@Injectable()
export class MailProviderFactory {
  private readonly logger = new Logger(MailProviderFactory.name);
  private lastResolvedAddress: string | null = null;

  constructor(private readonly config: ConfigService) {}

  getProviderName(): MailProviderName {
    return resolveMailProvider(this.config);
  }

  getLastResolvedAddress(): string | null {
    return this.lastResolvedAddress;
  }

  async createTransporter(): Promise<Transporter> {
    const snapshot = getMailTransportSnapshot(this.config);
    const provider = snapshot.provider;
    const configuredHost = this.resolveHost(provider, snapshot.host);
    const port = snapshot.port;
    const secure = snapshot.secure;
    const family = resolveSmtpIpFamily(this.config);

    if (!configuredHost || !snapshot.smtpUserExists || !snapshot.smtpPassExists) {
      throw new Error('SMTP credentials are incomplete for the configured mail provider');
    }

    const endpoint = await resolveSmtpEndpoint(configuredHost, family, snapshot.dnsTimeoutMs);
    this.lastResolvedAddress = endpoint.resolvedAddress;

    this.logger.log(
      `SMTP endpoint resolved ${JSON.stringify({
        provider,
        hostname: endpoint.hostname,
        connectHost: endpoint.connectHost,
        family: endpoint.family,
        resolvedAddress: endpoint.resolvedAddress,
        port,
        secure,
        pool: snapshot.pool,
        connectionTimeoutMs: snapshot.connectionTimeoutMs,
        greetingTimeoutMs: snapshot.greetingTimeoutMs,
        socketTimeoutMs: snapshot.socketTimeoutMs,
        dnsTimeoutMs: snapshot.dnsTimeoutMs,
      })}`,
    );

    return nodemailer.createTransport({
      host: endpoint.connectHost,
      port,
      secure,
      // When connectHost is an IP, keep original hostname for STARTTLS/SNI + cert verify.
      name: endpoint.hostname,
      auth: {
        user: this.config.get<string>('smtp.user'),
        pass: this.config.get<string>('smtp.pass'),
      },
      pool: snapshot.pool,
      maxConnections: this.config.get<number>('smtp.maxConnections') || 5,
      maxMessages: this.config.get<number>('smtp.maxMessages') || 100,
      connectionTimeout: snapshot.connectionTimeoutMs,
      greetingTimeout: snapshot.greetingTimeoutMs,
      socketTimeout: snapshot.socketTimeoutMs,
      // Hint for any remaining DNS inside nodemailer / pooled reconnects.
      family: endpoint.family === 0 ? 0 : endpoint.family,
      tls: {
        servername: endpoint.hostname,
        minVersion: 'TLSv1.2',
      },
      requireTLS: !secure && port === 587,
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
