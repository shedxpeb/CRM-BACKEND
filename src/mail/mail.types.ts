import {
  MAIL_HEALTH_STATES,
  MAIL_PROVIDERS,
  SMTP_FAILURE_TYPES,
} from './mail.constants';

export type MailHealthState = (typeof MAIL_HEALTH_STATES)[number];
export type SmtpFailureType = (typeof SMTP_FAILURE_TYPES)[number];
export type MailProviderName = (typeof MAIL_PROVIDERS)[number];

export type MailJobStatus =
  | 'queued'
  | 'preparing'
  | 'rendering'
  | 'sending'
  | 'accepted'
  | 'delivered'
  | 'failed'
  | 'retrying'
  | 'cancelled';

/** 4 = IPv4 only (recommended on Render), 6 = IPv6 only, 0 = OS default. */
export type SmtpIpFamily = 0 | 4 | 6;

export interface MailTransportSnapshot {
  timestamp: string;
  nodeEnv: string;
  provider: MailProviderName;
  host: string | null;
  port: number;
  secure: boolean;
  pool: boolean;
  verifyOnBoot: boolean;
  family: SmtpIpFamily;
  connectionTimeoutMs: number;
  greetingTimeoutMs: number;
  socketTimeoutMs: number;
  dnsTimeoutMs: number;
  resolvedAddress: string | null;
  fromEmail: string | null;
  fromName: string | null;
  smtpUserExists: boolean;
  smtpPassExists: boolean;
}

export interface MailHealthSnapshot {
  state: MailHealthState;
  provider: MailProviderName;
  verified: boolean;
  queue: number;
  lastVerify: string | null;
  lastError: string | null;
  failureType: SmtpFailureType | null;
  recoveryAttempt: number;
  nextRecoveryAt: string | null;
}

export interface ClassifiedSmtpError {
  failureType: SmtpFailureType;
  name: string | null;
  message: string;
  code: string | null;
  responseCode: number | null;
  response: string | null;
  command: string | null;
  address: string | null;
  port: number | null;
  hostname: string | null;
  stack: string | null;
  cause: ClassifiedSmtpError | null;
}
