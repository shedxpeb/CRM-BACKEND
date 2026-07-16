import { ConfigService } from '@nestjs/config';
import { isIpv4Literal } from './mail.dns';
import type {
  MailDeliveryChannel,
  MailProviderName,
  MailTransportSnapshot,
  SmtpIpFamily,
} from './mail.types';
import { MAIL_PROVIDERS } from './mail.constants';

export function resolveMailProvider(config: ConfigService): MailProviderName {
  const raw = (config.get<string>('mail.provider') || process.env.MAIL_PROVIDER || 'smtp').toLowerCase();
  if ((MAIL_PROVIDERS as readonly string[]).includes(raw)) {
    return raw as MailProviderName;
  }
  return 'smtp';
}

export function resolveSmtpIpFamily(config: ConfigService): SmtpIpFamily {
  const raw = config.get<number | string>('smtp.family');
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? '4'), 10);
  if (n === 0 || n === 6) return n;
  return 4;
}

export function hasResendApiKey(config: ConfigService): boolean {
  return !!(config.get<string>('mail.resendApiKey') || process.env.RESEND_API_KEY || '').trim();
}

export function getResendApiKey(config: ConfigService): string {
  return (config.get<string>('mail.resendApiKey') || process.env.RESEND_API_KEY || '').trim();
}

export function getMailTransportSnapshot(
  config: ConfigService,
  extras?: {
    resolvedAddress?: string | null;
    connectHost?: string | null;
    smtpHostname?: string | null;
    deliveryChannel?: MailDeliveryChannel;
  },
): MailTransportSnapshot {
  const host = config.get<string>('smtp.host') || null;
  const user = config.get<string>('smtp.user') || null;
  const pass = config.get<string>('smtp.pass');
  const port = config.get<number>('smtp.port') || 587;
  const secure = config.get<boolean>('smtp.secure') === true || port === 465;
  const pool = config.get<boolean>('smtp.pool') !== false;
  const verifyOnBoot = config.get<boolean>('smtp.verifyOnBoot') !== false;
  const fromEmail =
    config.get<string>('mail.resendFromEmail') ||
    config.get<string>('smtp.fromEmail') ||
    user ||
    null;
  const fromName = config.get<string>('smtp.fromName') || null;
  const provider = resolveMailProvider(config);
  const deliveryChannel: MailDeliveryChannel =
    extras?.deliveryChannel || (provider === 'resend' ? 'resend' : 'smtp');
  const family = resolveSmtpIpFamily(config);
  const connectHost = extras?.connectHost ?? extras?.resolvedAddress ?? null;
  const resolvedAddress = extras?.resolvedAddress ?? null;

  return {
    timestamp: new Date().toISOString(),
    nodeEnv: config.get<string>('nodeEnv') || 'development',
    provider,
    deliveryChannel,
    host,
    port,
    secure,
    pool,
    verifyOnBoot,
    family,
    connectionTimeoutMs: config.get<number>('smtp.connectionTimeoutMs') || 10_000,
    greetingTimeoutMs: config.get<number>('smtp.greetingTimeoutMs') || 10_000,
    socketTimeoutMs: config.get<number>('smtp.socketTimeoutMs') || 15_000,
    dnsTimeoutMs: config.get<number>('smtp.dnsTimeoutMs') || 5_000,
    resolvedAddress,
    connectHost,
    smtpHostname: extras?.smtpHostname ?? host,
    ipv4Only: family === 4,
    isIpv4Connect: !!connectHost && isIpv4Literal(connectHost),
    fromEmail,
    fromName,
    smtpUserExists: !!user,
    smtpPassExists: !!pass,
    resendApiKeyExists: hasResendApiKey(config),
  };
}

export function isSmtpFullyConfigured(snapshot: MailTransportSnapshot): boolean {
  return !!(snapshot.host && snapshot.smtpUserExists && snapshot.smtpPassExists);
}

export function isResendConfigured(config: ConfigService): boolean {
  return hasResendApiKey(config);
}
