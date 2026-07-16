import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isIpv4Literal } from './mail.dns';
import { MAIL_RECOVERY_BACKOFF_MS } from './mail.constants';
import { MailService } from './mail.service';
import { probeSmtpPorts } from './mail.smtp-probe';
import { MailTransportService } from './mail.transport';
import type { MailHealthSnapshot } from './mail.types';

@Injectable()
export class MailHealthService {
  constructor(
    private readonly mail: MailService,
    private readonly transport: MailTransportService,
    private readonly config: ConfigService,
  ) {}

  getStatus(): MailHealthSnapshot {
    return this.mail.getMailHealth();
  }

  getDetailedStatus() {
    const mail = this.getStatus();
    const config = this.transport.getConfigSnapshot();
    const connectHost = config.connectHost || config.resolvedAddress;
    const ipv4GuardPassed =
      mail.ipv4?.ipv4GuardPassed ??
      (config.family !== 4 || (!!connectHost && isIpv4Literal(connectHost)));

    return {
      mail,
      config,
      queue: this.mail.getQueueSnapshot(),
      /** Manual IPv4 check — connectHost must be dotted IPv4, never 2607:… */
      ipv4Check: {
        smtpIpFamily: config.family,
        ipv4Only: config.family === 4,
        connectHost: connectHost || null,
        resolvedAddress: config.resolvedAddress,
        isIpv4Connect: !!connectHost && isIpv4Literal(connectHost),
        ipv4GuardPassed,
        looksLikeIpv6: !!connectHost && connectHost.includes(':'),
        passCriteria:
          'When SMTP_IP_FAMILY=4 and deliveryChannel=smtp: isIpv4Connect=true, looksLikeIpv6=false, ipv4GuardPassed=true',
      },
      recovery: {
        attempt: mail.recoveryAttempt,
        nextRecoveryAt: mail.nextRecoveryAt,
        backoffMs: [...MAIL_RECOVERY_BACKOFF_MS],
      },
      timestamp: new Date().toISOString(),
    };
  }

  async verifyNow() {
    const verified = await this.transport.forceVerify();
    return {
      verified,
      mail: this.getStatus(),
      ipv4Check: this.getDetailedStatus().ipv4Check,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Option 1 diagnostic: probe Gmail SMTP 587/STARTTLS and 465/SSL over the same IPv4 host.
   * Call from Render: POST /mail/probe-smtp
   */
  async probeSmtp() {
    const hostname = this.config.get<string>('smtp.host') || 'smtp.gmail.com';
    const user = this.config.get<string>('smtp.user') || '';
    const pass = this.config.get<string>('smtp.pass') || '';
    if (!user || !pass) {
      throw new ServiceUnavailableException('SMTP_USER / SMTP_PASS required for probe');
    }

    const report = await probeSmtpPorts({
      hostname,
      user,
      pass,
      family: (this.config.get<number>('smtp.family') as 0 | 4 | 6) || 4,
      dnsTimeoutMs: this.config.get<number>('smtp.dnsTimeoutMs') || 5_000,
      connectionTimeoutMs: this.config.get<number>('smtp.connectionTimeoutMs') || 10_000,
      greetingTimeoutMs: this.config.get<number>('smtp.greetingTimeoutMs') || 10_000,
      socketTimeoutMs: this.config.get<number>('smtp.socketTimeoutMs') || 15_000,
    });

    return {
      ...report,
      mail: this.getStatus(),
      ipv4Check: this.getDetailedStatus().ipv4Check,
    };
  }
}
