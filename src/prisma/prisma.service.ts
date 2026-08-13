import { Injectable, OnModuleDestroy, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { getPrismaConnectionUrl, sleep } from './database-bootstrap';
import { TenantContextService } from '../common/services/tenant-context.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor(@Inject(TenantContextService) private tenantContextService: TenantContextService) {
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
    // Register tenant isolation middleware
    (this as any).$use(
      async (params, next) => {
        const context = this.tenantContextService.getContext();

        if (!context) {
          return next(params);
        }

        const { organizationId, isSuperAdmin, isImpersonation } = context;

        // SUPER_ADMIN bypasses tenant isolation unless impersonating
        if (isSuperAdmin && !isImpersonation) {
          return next(params);
        }

        if (!organizationId) {
          return next(params);
        }

        const model = params.model;
        const action = params.action;

        // Tenant-scoped models
        const tenantScopedModels = [
          'User',
          'Lead',
          'Customer',
          'Project',
          'Vendor',
          'InventoryItem',
          'InventoryCategory',
          'Warehouse',
          'StockMovement',
          'PurchaseOrder',
          'Supplier',
          'Task',
          'ItemMaster',
          'ItemVariant',
          'ItemBundle',
          'SalaryAdjustment',
          'Document',
          'AuditLog',
          'Role',
          'Permission',
          'UserRole',
          'OrganizationModule',
          'Session',
          'RefreshToken',
          'LoginAttempt',
          'OtpChallenge',
        ];

        if (!tenantScopedModels.includes(model)) {
          return next(params);
        }

        const tenantFilter = { organizationId };

        if (params.args?.where) {
          params.args.where = {
            AND: [params.args.where, tenantFilter],
          };
        } else {
          params.args.where = tenantFilter;
        }

        // Add isDeleted filter for soft delete models
        if (action === 'findFirst' || action === 'findMany') {
          const where = params.args.where;
          if (where && typeof where === 'object' && !('isDeleted' in where)) {
            params.args.where = {
              AND: [where, { isDeleted: false }],
            };
          }
        }

        if (action === 'create' || action === 'createMany') {
          const data = params.args.data;

          if (Array.isArray(data)) {
            params.args.data = data.map((item) => ({
              ...item,
              organizationId,
            }));
          } else if (data) {
            params.args.data = {
              ...data,
              organizationId,
            };
          }
        }

        if (action === 'update' || action === 'updateMany') {
          if (params.args?.data) {
            const { organizationId: _orgId, ...rest } = params.args.data;
            params.args.data = rest;
          }
        }

        return next(params);
      },
    );
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
