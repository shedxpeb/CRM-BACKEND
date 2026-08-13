import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  organizationId: string;
  userId: string;
  isSuperAdmin: boolean;
  isImpersonation: boolean;
  impersonationGrantId?: string;
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

  getUserId(): string | undefined {
    return this.storage.getStore()?.userId;
  }

  isSuperAdmin(): boolean {
    return this.storage.getStore()?.isSuperAdmin ?? false;
  }

  isImpersonation(): boolean {
    return this.storage.getStore()?.isImpersonation ?? false;
  }

  getImpersonationGrantId(): string | undefined {
    return this.storage.getStore()?.impersonationGrantId;
  }

  clear(): void {
    this.storage.disable();
  }

  setPrismaClient(prismaClient: any): void {
    // Store reference if needed for future use
  }
}
