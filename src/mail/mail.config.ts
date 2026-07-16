import { ConfigService } from '@nestjs/config';
import type { MailProviderName, MailTransportSnapshot } from './mail.types';
import { MAIL_PROVIDERS } from './mail.constants';

export function resolveMailProvider(config: ConfigService): MailProviderName {
  const raw = (config.get<string>('mail.provider') || process.env.MAIL_PROVIDER || 'smtp').toLowerCase();
  if ((MAIL_PROVIDERS as readonly string[]).includes(raw)) {
    return raw as MailProviderName;
  }
  return 'smtp';
}

export function getMailTransportSnapshot(config: ConfigService): MailTransportSnapshot {
  const host = config.get<string>('smtp.host') || null;
  const user = config.get<string>('smtp.user') || null;
  const pass = config.get<string>('smtp.pass');
  const port = config.get<number>('smtp.port') || 587;
  const secure = config.get<boolean>('smtp.secure') === true || port === 465;
  const pool = config.get<boolean>('smtp.pool') !== false;
  const verifyOnBoot = config.get<boolean>('smtp.verifyOnBoot') !== false;
  const fromEmail = config.get<string>('smtp.fromEmail') || user || null;
  const fromName = config.get<string>('smtp.fromName') || null;

  return {
    timestamp: new Date().toISOString(),
    nodeEnv: config.get<string>('nodeEnv') || 'development',
    provider: resolveMailProvider(config),
    host,
    port,
    secure,
    pool,
    verifyOnBoot,
    fromEmail,
    fromName,
    smtpUserExists: !!user,
    smtpPassExists: !!pass,
  };
}

export function isSmtpFullyConfigured(snapshot: MailTransportSnapshot): boolean {
  return !!(snapshot.host && snapshot.smtpUserExists && snapshot.smtpPassExists);
}
