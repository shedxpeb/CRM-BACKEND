import { promises as dns } from 'dns';
import type { SmtpIpFamily } from './mail.types';

export interface ResolvedSmtpEndpoint {
  /** Hostname from config (used for TLS SNI / EHLO identity). */
  hostname: string;
  /** Address passed to nodemailer `host` — IPv4 literal when family=4 resolves. */
  connectHost: string;
  family: 4 | 6 | 0;
  resolvedAddress: string | null;
}

export class SmtpDnsError extends Error {
  readonly code = 'SMTP_DNS_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'SmtpDnsError';
  }
}

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;

export function isIpv4Literal(value: string): boolean {
  if (!IPV4_RE.test(value)) return false;
  return value.split('.').every((part) => {
    const n = Number(part);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

export function isIpv6Literal(value: string): boolean {
  return value.includes(':');
}

/** Hard guard: never pass an IPv6 connect target when SMTP_IP_FAMILY=4. */
export function assertIpv4ConnectHost(connectHost: string, hostname: string): void {
  if (isIpv6Literal(connectHost) || !isIpv4Literal(connectHost)) {
    throw new SmtpDnsError(
      `Refusing non-IPv4 SMTP connectHost for ${hostname}: ${connectHost} (SMTP_IP_FAMILY=4)`,
    );
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new SmtpDnsError(`DNS lookup timed out after ${timeoutMs}ms (${label})`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Prefer IPv4 on hosts (e.g. Render) where IPv6 routes to smtp.* are unreachable.
 * When family=4, never fall back to hostname-only connect (that reopens AAAA selection).
 */
export async function resolveSmtpEndpoint(
  hostname: string,
  family: SmtpIpFamily = 4,
  dnsTimeoutMs = 5_000,
): Promise<ResolvedSmtpEndpoint> {
  const host = hostname.trim();
  if (!host) {
    throw new SmtpDnsError('SMTP host is empty');
  }

  // Already an IPv4 literal — keep as-is.
  if (isIpv4Literal(host)) {
    return { hostname: host, connectHost: host, family: 4, resolvedAddress: host };
  }

  // Already an IPv6 literal.
  if (isIpv6Literal(host)) {
    if (family === 4) {
      throw new SmtpDnsError(`SMTP host is IPv6 but SMTP_IP_FAMILY=4: ${host}`);
    }
    return { hostname: host, connectHost: host, family: 6, resolvedAddress: host };
  }

  if (family === 0) {
    return { hostname: host, connectHost: host, family: 0, resolvedAddress: null };
  }

  try {
    const result = await withTimeout(dns.lookup(host, { family, all: false }), dnsTimeoutMs, host);

    if (family === 4) {
      if (result.family !== 4 || !isIpv4Literal(result.address) || isIpv6Literal(result.address)) {
        throw new SmtpDnsError(
          `Expected IPv4 for ${host}, got family=${result.family} address=${result.address}`,
        );
      }
      assertIpv4ConnectHost(result.address, host);
    }

    return {
      hostname: host,
      connectHost: result.address,
      family: result.family === 6 ? 6 : 4,
      resolvedAddress: result.address,
    };
  } catch (error: unknown) {
    if (error instanceof SmtpDnsError) throw error;

    const message = error instanceof Error ? error.message : String(error);
    // Hard-fail when forcing IPv4 — hostname fallback would let Node pick AAAA again.
    if (family === 4) {
      throw new SmtpDnsError(`IPv4 DNS lookup failed for ${host}: ${message}`);
    }

    throw new SmtpDnsError(`DNS lookup failed for ${host}: ${message}`);
  }
}
