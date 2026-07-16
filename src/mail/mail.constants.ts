export const MAIL_HEALTH_STATES = [
  'UNKNOWN',
  'CONNECTING',
  'READY',
  'DEGRADED',
  'FAILED',
  'RECOVERING',
] as const;

export const SMTP_FAILURE_TYPES = [
  'SMTP_AUTH_FAILED',
  'SMTP_TIMEOUT',
  'SMTP_DNS_ERROR',
  'SMTP_TLS_ERROR',
  'SMTP_IPV4_ERROR',
  'SMTP_IPV6_ERROR',
  'SMTP_CONNECTION_REFUSED',
  'SMTP_PROVIDER_REJECTED',
  'SMTP_RATE_LIMIT',
  'SMTP_NOT_CONFIGURED',
  'SMTP_EGRESS_BLOCKED',
  'SMTP_UNKNOWN',
] as const;

/** Recovery backoff schedule (ms): 5s → 15s → 30s → 1m → 5m (then holds at 5m). */
export const MAIL_RECOVERY_BACKOFF_MS = [5_000, 15_000, 30_000, 60_000, 300_000] as const;

/** Network/transient failures eligible for automatic recovery — never auth/config. */
export const TRANSIENT_SMTP_FAILURES = [
  'SMTP_TIMEOUT',
  'SMTP_DNS_ERROR',
  'SMTP_IPV4_ERROR',
  'SMTP_IPV6_ERROR',
  'SMTP_CONNECTION_REFUSED',
  'SMTP_RATE_LIMIT',
  'SMTP_TLS_ERROR',
  'SMTP_EGRESS_BLOCKED',
  'SMTP_UNKNOWN',
] as const;

export function isTransientSmtpFailure(failureType: string | null | undefined): boolean {
  return !!failureType && (TRANSIENT_SMTP_FAILURES as readonly string[]).includes(failureType);
}

export const MAIL_PROVIDERS = [
  'smtp',
  'gmail',
  'zoho',
  'microsoft365',
  'ses',
  'sendgrid',
  'mailgun',
  'resend',
  'auto',
] as const;

/** Failures that usually mean the host blocks outbound SMTP (use HTTPS provider). */
export const SMTP_EGRESS_FAILURES = [
  'SMTP_TIMEOUT',
  'SMTP_IPV4_ERROR',
  'SMTP_IPV6_ERROR',
  'SMTP_CONNECTION_REFUSED',
  'SMTP_EGRESS_BLOCKED',
] as const;

export function isSmtpEgressFailure(failureType: string | null | undefined): boolean {
  return !!failureType && (SMTP_EGRESS_FAILURES as readonly string[]).includes(failureType);
}
