import { Logger } from '@nestjs/common';

export interface ResendSendInput {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface ResendSendResult {
  id: string;
  accepted: string[];
  rejected: string[];
  pending: string[];
  messageId: string;
  response: string;
  envelope: { from: string; to: string[] };
}

/**
 * HTTPS mail delivery via Resend (port 443).
 * Use on hosts that block outbound SMTP (e.g. Render free tier).
 */
export class ResendHttpClient {
  private readonly logger = new Logger(ResendHttpClient.name);
  private readonly baseUrl = 'https://api.resend.com';

  constructor(private readonly apiKey: string) {}

  async verify(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/domains`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });

    if (res.status === 401 || res.status === 403) {
      const body = await res.text().catch(() => '');
      throw Object.assign(new Error(`Resend API auth failed (${res.status})`), {
        code: 'EAUTH',
        response: body,
        responseCode: res.status,
      });
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw Object.assign(new Error(`Resend verify failed (${res.status})`), {
        code: 'SMTP_PROVIDER_REJECTED',
        response: body,
        responseCode: res.status,
      });
    }
  }

  async send(input: ResendSendInput): Promise<ResendSendResult> {
    const payload: Record<string, unknown> = {
      from: input.from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    };
    if (input.html?.trim()) payload.html = input.html;
    if (input.replyTo) payload.reply_to = input.replyTo;

    const res = await fetch(`${this.baseUrl}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    let parsed: { id?: string; message?: string; name?: string } = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      parsed = { message: raw };
    }

    if (!res.ok) {
      this.logger.error(
        `Resend send rejected ${JSON.stringify({ status: res.status, name: parsed.name || null })}`,
      );
      throw Object.assign(new Error(parsed.message || `Resend send failed (${res.status})`), {
        code: res.status === 401 || res.status === 403 ? 'EAUTH' : 'SMTP_PROVIDER_REJECTED',
        response: raw,
        responseCode: res.status,
      });
    }

    const id = parsed.id || `resend_${Date.now()}`;
    return {
      id,
      accepted: [input.to],
      rejected: [],
      pending: [],
      messageId: id,
      response: '250 Resend accepted',
      envelope: { from: input.from, to: [input.to] },
    };
  }
}
