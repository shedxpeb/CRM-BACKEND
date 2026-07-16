import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_ORG_KEY } from '../decorators/org-scope.decorator';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipOrg = this.reflector.getAllAndOverride<boolean>(SKIP_ORG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipOrg) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return true;

    if (user.role === 'SUPER_ADMIN') return true;

    if (user.role === 'OWNER' && user.organizationId) {
      request.organizationId = user.organizationId;
      return true;
    }

    if (!user.organizationId) {
      throw new ForbiddenException('No organization context');
    }

    request.organizationId = user.organizationId;
    return true;
  }
}
