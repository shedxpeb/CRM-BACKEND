import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { getPrismaConnectionUrl, sleep } from './database-bootstrap';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor() {
    const dbUrl = getPrismaConnectionUrl();
    const pool = new Pool({
      connectionString: dbUrl,
      max: 10,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    });

    super({
      adapter: new PrismaPg(pool),
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

    this.pool = pool;
    this.logger.log(`DATABASE_URL: ${dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'NOT SET'}`);
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  private async connectWithRetry(maxAttempts = 5) {
    const dbUrl = getPrismaConnectionUrl();
    const target = this.describeTarget(dbUrl);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connected successfully');
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Database connection attempt ${attempt}/${maxAttempts} failed: ${message}`,
        );
        if (attempt === maxAttempts) {
          this.logger.error(`Database connection failed after ${maxAttempts} attempts (${target})`);
          throw new Error(
            `Database is unavailable at ${target}. Start your database first, then retry backend startup.`,
          );
        }
        await sleep(attempt * 1000);
      }
    }
  }

  private describeTarget(connectionUrl: string): string {
    try {
      const url = new URL(connectionUrl);
      return `${url.hostname}:${url.port || '5432'}`;
    } catch {
      return 'configured database host';
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
