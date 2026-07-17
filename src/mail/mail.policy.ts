import { Prisma } from '@prisma/client';

/**
 * Production mail architecture rule:
 *
 * Email content must never be persisted in the database. Templates remain in
 * source code and are rendered dynamically at runtime. Only minimal operational
 * metadata (e.g., audit event, send status, provider, timestamp) may be logged.
 * OTP values must be stored only as secure hashes with expiration and deleted
 * immediately after use or expiry.
 */

export const MAIL_CONTENT_PERSISTENCE_RULE =
  'Email content must never be persisted in the database. Templates remain in source code and are rendered dynamically at runtime. Only minimal operational metadata (e.g., audit event, send status, provider, timestamp) may be logged. OTP values must be stored only as secure hashes with expiration and deleted immediately after use or expiry.';

const FORBIDDEN_AUDIT_KEYS = new Set([
  'otp',
  'code',
  'plainOtp',
  'password',
  'html',
  'text',
  'body',
  'subject',
  'templateHtml',
  'templateText',
  'emailHtml',
  'emailText',
  'smtpPass',
  'smtp_pass',
  'jwt',
  'token',
  'accessToken',
  'refreshToken',
  'cookieSecret',
  'cookie_secret',
]);

/** Prisma-safe JSON object: only primitives (no nested secrets / HTML blobs). */
export type MailAuditJson = Prisma.InputJsonObject;

export function sanitizeMailAuditMetadata(
  input: Record<string, unknown> | null | undefined,
): MailAuditJson {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_AUDIT_KEYS.has(key)) continue;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      out[key] = value;
      continue;
    }
    if (value instanceof Date) {
      out[key] = value.toISOString();
    }
  }
  return out;
}

export function buildMailAuditMetadata(params: {
  recipient?: string;
  purpose?: string;
  provider?: string;
  status?: 'SUCCESS' | 'FAILED' | 'PENDING';
  requestId?: string;
  failureType?: string | null;
  extra?: Record<string, unknown>;
}): MailAuditJson {
  return sanitizeMailAuditMetadata({
    recipient: params.recipient,
    purpose: params.purpose,
    provider: params.provider,
    status: params.status,
    requestId: params.requestId,
    failureType: params.failureType || undefined,
    ...params.extra,
  });
}

/** Explicit Prisma JSON cast for create/update payloads. */
export function toPrismaJson(value: MailAuditJson): Prisma.InputJsonValue {
  return value;
}
