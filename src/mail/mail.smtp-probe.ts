import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { assertIpv4ConnectHost, isIpv4Literal, resolveSmtpEndpoint } from './mail.dns';
import type { SmtpIpFamily } from './mail.types';

export interface SmtpPortProbeTarget {
  port: number;
  secure: boolean;
  mode: 'STARTTLS' | 'SSL';
}

export interface SmtpPortProbeResult {
  port: number;
  secure: boolean;
  mode: 'STARTTLS' | 'SSL';
  ok: boolean;
  elapsedMs: number;
  failureType: string | null;
  message: string | null;
  code: string | null;
}

export interface SmtpPortProbeReport {
  hostname: string;
  connectHost: string;
  family: 4 | 6 | 0;
  isIpv4Connect: boolean;
  looksLikeIpv6: boolean;
  ipv4GuardPassed: boolean;
  results: SmtpPortProbeResult[];
  conclusion: string;
  timestamp: string;
}

const DEFAULT_TARGETS: SmtpPortProbeTarget[] = [
  { port: 587, secure: false, mode: 'STARTTLS' },
  { port: 465, secure: true, mode: 'SSL' },
];

/**
 * One-shot dual-port SMTP probe over a forced IPv4 connect host.
 * Does not mutate the process-wide transporter.
 */
export async function probeSmtpPorts(params: {
  hostname: string;
  user: string;
  pass: string;
  family?: SmtpIpFamily;
  dnsTimeoutMs?: number;
  connectionTimeoutMs?: number;
  greetingTimeoutMs?: number;
  socketTimeoutMs?: number;
  targets?: SmtpPortProbeTarget[];
}): Promise<SmtpPortProbeReport> {
  const logger = new Logger('SmtpPortProbe');
  const family = params.family ?? 4;
  const hostname = params.hostname.trim();
  const endpoint = await resolveSmtpEndpoint(hostname, family, params.dnsTimeoutMs ?? 5_000);

  if (family === 4) {
    assertIpv4ConnectHost(endpoint.connectHost, endpoint.hostname);
  }

  const connectionTimeout = params.connectionTimeoutMs ?? 10_000;
  const greetingTimeout = params.greetingTimeoutMs ?? 10_000;
  const socketTimeout = params.socketTimeoutMs ?? 15_000;
  const targets = params.targets ?? DEFAULT_TARGETS;
  const results: SmtpPortProbeResult[] = [];

  for (const target of targets) {
    const started = Date.now();
    const transporter = nodemailer.createTransport({
      host: endpoint.connectHost,
      port: target.port,
      secure: target.secure,
      name: endpoint.hostname,
      auth: { user: params.user, pass: params.pass },
      pool: false,
      connectionTimeout,
      greetingTimeout,
      socketTimeout,
      family: family === 0 ? 0 : family,
      tls: {
        servername: endpoint.hostname,
        minVersion: 'TLSv1.2',
      },
      requireTLS: !target.secure && target.port === 587,
    } as nodemailer.TransportOptions);

    try {
      await transporter.verify();
      results.push({
        port: target.port,
        secure: target.secure,
        mode: target.mode,
        ok: true,
        elapsedMs: Date.now() - started,
        failureType: null,
        message: null,
        code: null,
      });
      logger.log(
        `SMTP probe SUCCESS ${JSON.stringify({
          port: target.port,
          mode: target.mode,
          connectHost: endpoint.connectHost,
          elapsedMs: Date.now() - started,
        })}`,
      );
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      const message = err?.message || String(error);
      const code = typeof err?.code === 'string' ? err.code : null;
      const lower = message.toLowerCase();
      let failureType = 'SMTP_UNKNOWN';
      if (code === 'ETIMEDOUT' || lower.includes('timeout')) failureType = 'SMTP_TIMEOUT';
      else if (code === 'EAUTH' || lower.includes('auth')) failureType = 'SMTP_AUTH_FAILED';
      else if (code === 'ECONNREFUSED') failureType = 'SMTP_CONNECTION_REFUSED';
      else if (lower.includes('enetunreach') || lower.includes('ehostunreach')) {
        failureType = message.includes(':') ? 'SMTP_IPV6_ERROR' : 'SMTP_IPV4_ERROR';
      }

      results.push({
        port: target.port,
        secure: target.secure,
        mode: target.mode,
        ok: false,
        elapsedMs: Date.now() - started,
        failureType,
        message,
        code,
      });
      logger.warn(
        `SMTP probe FAILED ${JSON.stringify({
          port: target.port,
          mode: target.mode,
          connectHost: endpoint.connectHost,
          failureType,
          elapsedMs: Date.now() - started,
        })}`,
      );
    } finally {
      try {
        transporter.close();
      } catch {
        // ignore
      }
    }
  }

  const anyOk = results.some((r) => r.ok);
  const bothTimeout = results.length > 0 && results.every((r) => !r.ok && r.failureType === 'SMTP_TIMEOUT');
  let conclusion: string;
  if (anyOk) {
    const okPorts = results.filter((r) => r.ok).map((r) => `${r.port}/${r.mode}`).join(', ');
    conclusion = `At least one SMTP path works over IPv4 (${okPorts}). Prefer that port in SMTP_PORT / SMTP_SECURE.`;
  } else if (bothTimeout) {
    conclusion =
      'Both 587/STARTTLS and 465/SSL timed out over IPv4. Likely Render→Gmail SMTP egress block (not IPv6 / not app code). Use paid Render, Hostinger SMTP, or RESEND_API_KEY.';
  } else {
    conclusion = 'No SMTP probe succeeded. Inspect per-port failureType (auth vs network).';
  }

  return {
    hostname: endpoint.hostname,
    connectHost: endpoint.connectHost,
    family: endpoint.family,
    isIpv4Connect: isIpv4Literal(endpoint.connectHost),
    looksLikeIpv6: endpoint.connectHost.includes(':'),
    ipv4GuardPassed: family !== 4 || isIpv4Literal(endpoint.connectHost),
    results,
    conclusion,
    timestamp: new Date().toISOString(),
  };
}
