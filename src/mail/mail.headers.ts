import { randomBytes } from 'crypto';

/**
 * RFC-compliant transactional email headers for better inbox placement.
 * Does not change SMTP provider — only message metadata.
 */
export interface MailHeaderInput {
  fromName: string;
  fromEmail: string;
  to: string;
  replyTo?: string;
  subject: string;
  /** Used only for X-Mailer identity — branding company name */
  appName?: string;
  appDomain?: string;
}

export function extractEmailDomain(email: string): string {
  const part = (email || '').split('@')[1]?.trim().toLowerCase();
  return part || 'localhost';
}

export function buildMessageId(fromEmail: string): string {
  const domain = extractEmailDomain(fromEmail);
  const id = randomBytes(16).toString('hex');
  return `<${id}.${Date.now()}@${domain}>`;
}

export function buildMailHeaders(input: MailHeaderInput): Record<string, string> {
  const replyTo = input.replyTo || input.fromEmail;
  const mailer = input.appName ? `${input.appName} Mailer` : 'Transactional Mailer';

  return {
    'Message-ID': buildMessageId(input.fromEmail),
    'Reply-To': replyTo,
    'MIME-Version': '1.0',
    'X-Mailer': mailer,
    'X-Priority': '3',
    'X-MSMail-Priority': 'Normal',
    Importance: 'Normal',
  };
}

export function formatFromAddress(name: string, email: string): string {
  const safeName = (name || 'Account').replace(/["\\]/g, '');
  return `"${safeName}" <${email}>`;
}
