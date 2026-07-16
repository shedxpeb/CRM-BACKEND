import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaHealthIndicator } from './prisma.health.indicator';
import { Public } from '../auth/decorators/public.decorator';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
@SkipThrottle()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  /** Root — confirms process is accepting HTTP */
  @Get()
  @Public()
  root() {
    return {
      status: 'ok',
      service: this.config.get<string>('branding.companyName') || 'API',
      timestamp: new Date().toISOString(),
    };
  }

  /** Liveness — process up (no dependency checks). Use for load balancer / Render. */
  @Get('live')
  @Public()
  live() {
    return { status: 'ok', check: 'live', timestamp: new Date().toISOString() };
  }

  /** Readiness — DB required; SMTP reported but does not fail readiness unless SMTP_REQUIRED=true */
  @Get('ready')
  @Public()
  async ready() {
    let database: 'up' | 'down' = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }

    const smtpConfigured = !!(
      this.config.get('smtp.host') &&
      this.config.get('smtp.user') &&
      this.config.get('smtp.pass')
    );
    const smtp = smtpConfigured && this.mail.isSmtpReady() ? 'up' : smtpConfigured ? 'degraded' : 'unconfigured';
    const requireSmtp = this.config.get<string>('SMTP_REQUIRED') === 'true' || process.env.SMTP_REQUIRED === 'true';

    const ready = database === 'up' && (!requireSmtp || smtp === 'up');
    const body = {
      status: ready ? 'ok' : 'not_ready',
      check: 'ready',
      database,
      smtp,
      timestamp: new Date().toISOString(),
    };
    if (!ready) {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }

  /** Deep health — DB + generous memory ceilings (not for deploy probes) */
  @Get('health')
  @HealthCheck()
  @Public()
  check() {
    const heapMb = parseInt(process.env.HEALTH_HEAP_MB || '1024', 10);
    const rssMb = parseInt(process.env.HEALTH_RSS_MB || '1536', 10);
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.memory.checkHeap('memory_heap', heapMb * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', rssMb * 1024 * 1024),
    ]);
  }
}
