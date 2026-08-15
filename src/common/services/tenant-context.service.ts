import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  organizationId: string;
  tenantId?: string;
  crmOrganizationId?: string;
  userId: string;
  isSuperAdmin: boolean;
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  run<T>(context: TenantContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  getContext(): TenantContext | undefined {
    return this.storage.getStore();
  }

  getOrganizationId(): string | undefined {
    return this.storage.getStore()?.organizationId;
  }

  getTenantId(): string | undefined {
    return this.storage.getStore()?.tenantId || this.storage.getStore()?.organizationId;
  }

  getCrmOrganizationId(): string | undefined {
    return this.storage.getStore()?.crmOrganizationId || this.storage.getStore()?.organizationId;
  }

  getUserId(): string | undefined {
    return this.storage.getStore()?.userId;
  }

  isSuperAdmin(): boolean {
    return this.storage.getStore()?.isSuperAdmin ?? false;
  }

  clear(): void {
    this.storage.disable();
  }

  setPrismaClient(_prismaClient: any): void {
    // Store reference if needed for future use
  }
}
