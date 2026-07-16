import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SendMailOptions, SentMessageInfo, Transporter } from 'nodemailer';
import { isTransientSmtpFailure, MAIL_RECOVERY_BACKOFF_MS } from './mail.constants';
import { getMailTransportSnapshot, isSmtpFullyConfigured } from './mail.config';
import { MailProviderFactory } from './mail.provider';
import type {
  ClassifiedSmtpError,
  MailHealthSnapshot,
  MailHealthState,
  MailTransportSnapshot,
  SmtpFailureType,
} from './mail.types';

@Injectable()
export class MailTransportService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailTransportService.name);
  private transporter: Transporter | null = null;
  private state: MailHealthState = 'UNKNOWN';
  private failureType: SmtpFailureType | null = null;
  private lastError: string | null = null;
  private lastVerify: string | null = null;
  private recoveryAttempt = 0;
  private nextRecoveryAt: Date | null = null;
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private verifying = false;

  constructor(
    private readonly config: ConfigService,
    private readonly providers: MailProviderFactory,
  ) {}

  async onModuleInit() {
    await this.initialize();
  }

  onModuleDestroy() {
    this.clearRecoveryTimer();
    this.closeTransporter();
  }

  getTransporter(): Transporter | null {
    return this.transporter;
  }

  isReady(): boolean {
    return this.state === 'READY';
  }

  getFailureType(): SmtpFailureType | null {
    return this.failureType;
  }

  getConfigSnapshot(): MailTransportSnapshot {
    return getMailTransportSnapshot(this.config, {
      resolvedAddress: this.providers.getLastResolvedAddress(),
    });
  }

  getHealth(queuePending = 0): MailHealthSnapshot {
    return {
      state: this.state,
      provider: this.providers.getProviderName(),
      verified: this.state === 'READY',
      queue: queuePending,
      lastVerify: this.lastVerify,
      lastError: this.lastError,
      failureType: this.failureType,
      recoveryAttempt: this.recoveryAttempt,
      nextRecoveryAt: this.nextRecoveryAt?.toISOString() || null,
    };
  }

  async forceVerify(): Promise<boolean> {
    try {
      this.closeTransporter();
      this.transporter = await this.providers.createTransporter();
    } catch (error: unknown) {
      this.markFailed(error, 'manual-create');
      return false;
    }
    return this.verifyTransport('manual');
  }

  async sendMail(options: SendMailOptions): Promise<SentMessageInfo> {
    if (!this.transporter) {
      throw Object.assign(new Error('SMTP transporter is not configured'), { code: 'SMTP_NOT_CONFIGURED' });
    }
    try {
      return await this.transporter.sendMail(options);
    } catch (error: unknown) {
      this.markFailed(error, 'send');
      throw error;
    }
  }

  private async initialize() {
    const snapshot = this.getConfigSnapshot();
    this.logger.log(`SMTP Configuration ${JSON.stringify(snapshot)}`);

    if (!isSmtpFullyConfigured(snapshot)) {
      this.state = 'FAILED';
      this.failureType = 'SMTP_NOT_CONFIGURED';
      this.lastError = 'SMTP_HOST / SMTP_USER / SMTP_PASS incomplete';
      this.logger.error(
        `Transport Verify Result FAILED ${JSON.stringify({
          failureType: this.failureType,
          reason: this.lastError,
          ...snapshot,
        })}`,
      );
      return;
    }

    this.state = 'CONNECTING';
    try {
      this.transporter = await this.providers.createTransporter();
    } catch (error: unknown) {
      this.markFailed(error, 'create');
      return;
    }

    if (!snapshot.verifyOnBoot) {
      this.state = 'READY';
      this.failureType = null;
      this.lastError = null;
      this.lastVerify = new Date().toISOString();
      this.logger.warn('Transport Verify Result SKIPPED (SMTP_VERIFY_ON_BOOT=false); state=READY');
      return;
    }

    await this.verifyTransport('boot');
  }

  private async verifyTransport(phase: 'boot' | 'recovery' | 'manual'): Promise<boolean> {
    if (!this.transporter || this.verifying) return this.state === 'READY';
    this.verifying = true;
    if (phase === 'recovery') this.state = 'RECOVERING';
    if (phase === 'boot' || phase === 'manual') this.state = 'CONNECTING';

    const snapshot = this.getConfigSnapshot();
    try {
      await this.transporter.verify();
      this.state = 'READY';
      this.failureType = null;
      this.lastError = null;
      this.lastVerify = new Date().toISOString();
      this.recoveryAttempt = 0;
      this.nextRecoveryAt = null;
      this.clearRecoveryTimer();
      this.logger.log(
        `Transport Verify Result SUCCESS ${JSON.stringify({
          phase,
          host: snapshot.host,
          resolvedAddress: snapshot.resolvedAddress,
          family: snapshot.family,
          port: snapshot.port,
          secure: snapshot.secure,
          pool: snapshot.pool,
          provider: snapshot.provider,
          fromEmail: snapshot.fromEmail,
          fromName: snapshot.fromName,
        })}`,
      );
      return true;
    } catch (error: unknown) {
      this.markFailed(error, phase);
      return false;
    } finally {
      this.verifying = false;
    }
  }

  private markFailed(error: unknown, phase: string) {
    const classified = this.classifySmtpFailure(error);
    this.state = phase === 'send' ? 'DEGRADED' : 'FAILED';
    this.failureType = classified.failureType;
    this.lastError = classified.message;
    this.lastVerify = new Date().toISOString();

    this.logger.error(
      `Transport Verify Result FAILED ${JSON.stringify({
        phase,
        failureType: classified.failureType,
        state: this.state,
        ...this.getConfigSnapshot(),
        error: {
          failureType: classified.failureType,
          name: classified.name,
          message: classified.message,
          code: classified.code,
          responseCode: classified.responseCode,
          command: classified.command,
          address: classified.address,
          port: classified.port,
        },
      })}`,
    );

    if (isTransientSmtpFailure(classified.failureType)) {
      this.scheduleRecovery();
    } else {
      this.logger.warn(
        `Mail transport recovery skipped (non-transient) ${JSON.stringify({
          failureType: classified.failureType,
          phase,
        })}`,
      );
    }
  }

  private scheduleRecovery() {
    if (this.recoveryTimer) return;
    if (!isSmtpFullyConfigured(this.getConfigSnapshot())) return;
    if (!isTransientSmtpFailure(this.failureType)) return;

    const delay =
      MAIL_RECOVERY_BACKOFF_MS[Math.min(this.recoveryAttempt, MAIL_RECOVERY_BACKOFF_MS.length - 1)];
    this.recoveryAttempt += 1;
    this.nextRecoveryAt = new Date(Date.now() + delay);

    this.logger.warn(
      `Mail transport recovery scheduled ${JSON.stringify({
        attempt: this.recoveryAttempt,
        delayMs: delay,
        nextRecoveryAt: this.nextRecoveryAt.toISOString(),
        failureType: this.failureType,
        state: this.state,
      })}`,
    );

    this.recoveryTimer = setTimeout(async () => {
      this.recoveryTimer = null;
      this.state = 'RECOVERING';
      try {
        // Recreate transporter each recovery cycle (fresh IPv4 DNS + sockets).
        this.closeTransporter();
        this.transporter = await this.providers.createTransporter();
      } catch (error: unknown) {
        this.markFailed(error, 'recovery-create');
        return;
      }
      await this.verifyTransport('recovery');
      if (!this.isReady() && isTransientSmtpFailure(this.failureType)) {
        this.scheduleRecovery();
      }
    }, delay);
  }

  private clearRecoveryTimer() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  private closeTransporter() {
    if (this.transporter && typeof (this.transporter as { close?: () => void }).close === 'function') {
      try {
        (this.transporter as { close: () => void }).close();
      } catch {
        // ignore close errors
      }
    }
    this.transporter = null;
  }

  private classifySmtpFailure(error: unknown, depth = 0): ClassifiedSmtpError {
    const value = (error && typeof error === 'object' ? error : {}) as Record<string, unknown> & {
      name?: string;
      message?: string;
      stack?: string;
      cause?: unknown;
    };
    const code = typeof value.code === 'string' ? value.code : '';
    const message = typeof value.message === 'string' ? value.message : String(error);
    const lower = message.toLowerCase();
    const response = typeof value.response === 'string' ? value.response.toLowerCase() : '';
    const responseCode = typeof value.responseCode === 'number' ? value.responseCode : null;
    const address = typeof value.address === 'string' ? value.address : null;
    const looksIpv6 =
      (!!address && address.includes(':')) ||
      /([0-9a-f]{0,4}:){2,}[0-9a-f]{0,4}/i.test(message) ||
      lower.includes(':::');

    let failureType: SmtpFailureType = 'SMTP_UNKNOWN';
    if (code === 'EAUTH' || lower.includes('invalid login') || lower.includes('authentication') || response.includes('auth')) {
      failureType = 'SMTP_AUTH_FAILED';
    } else if (
      code === 'ENETUNREACH' ||
      code === 'EHOSTUNREACH' ||
      lower.includes('enetunreach') ||
      lower.includes('ehostunreach')
    ) {
      failureType = looksIpv6 ? 'SMTP_IPV6_ERROR' : 'SMTP_IPV4_ERROR';
    } else if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT' || lower.includes('timeout')) {
      failureType = 'SMTP_TIMEOUT';
    } else if (
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN' ||
      code === 'SMTP_DNS_ERROR' ||
      value.name === 'SmtpDnsError' ||
      lower.includes('dns lookup')
    ) {
      failureType = 'SMTP_DNS_ERROR';
    } else if (code === 'ECONNREFUSED') {
      failureType = 'SMTP_CONNECTION_REFUSED';
    } else if (
      lower.includes('tls') ||
      lower.includes('ssl') ||
      lower.includes('certificate') ||
      lower.includes('wrong version number')
    ) {
      failureType = 'SMTP_TLS_ERROR';
    } else if (code === 'ESOCKET') {
      // Generic socket error — prefer IPv6 classification when address/message shows it.
      failureType = looksIpv6 ? 'SMTP_IPV6_ERROR' : 'SMTP_TIMEOUT';
    } else if (responseCode === 421 || responseCode === 450 || lower.includes('rate') || lower.includes('too many')) {
      failureType = 'SMTP_RATE_LIMIT';
    } else if (responseCode !== null && responseCode >= 400) {
      failureType = 'SMTP_PROVIDER_REJECTED';
    } else if (code === 'SMTP_NOT_CONFIGURED' || lower.includes('incomplete')) {
      failureType = 'SMTP_NOT_CONFIGURED';
    }

    return {
      failureType,
      name: value.name || (error instanceof Error ? error.name : null),
      message,
      code: code || null,
      responseCode,
      response: typeof value.response === 'string' ? value.response : null,
      command: typeof value.command === 'string' ? value.command : null,
      address,
      port: typeof value.port === 'number' ? value.port : null,
      hostname: typeof value.hostname === 'string' ? value.hostname : null,
      stack: typeof value.stack === 'string' ? value.stack : error instanceof Error ? error.stack || null : null,
      cause: value.cause && depth < 3 ? this.classifySmtpFailure(value.cause, depth + 1) : null,
    };
  }
}
