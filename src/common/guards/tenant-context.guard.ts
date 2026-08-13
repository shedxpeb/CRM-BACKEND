import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { TenantContextService } from '../services/tenant-context.service';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { Reflector } from '@nestjs/core';

/**
 * Tenant Context Guard
 *
 * Sets the tenant context from the authenticated user for use by Prisma middleware.
 * This guard must run before any database queries to ensure proper tenant isolation.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  private readonly logger = new Logger(TenantContextGuard.name);

  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true; // No user context, will be handled by auth guards
    }

    // Build tenant context from user
    const tenantContext = {
      organizationId: user.organizationId,
      userId: user.id,
      isSuperAdmin: user.role === 'SUPER_ADMIN',
      isImpersonation: user.isImpersonation || false,
      impersonationGrantId: user.impersonationGrantId,
    };

    // Run the request within tenant context
    return this.tenantContextService.run(tenantContext, () => true);
  }
}
