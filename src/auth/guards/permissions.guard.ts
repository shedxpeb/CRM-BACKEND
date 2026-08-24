import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { ROLE_NAME_ALIASES } from '../../common/constants/role-aliases';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PermissionInheritanceService } from '../../permissions/permission-inheritance.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private permissionInheritance: PermissionInheritanceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    // Platform super-admin only — never treat tenant OWNER as global admin
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Tenant OWNER/COMPANY_OWNER: full access within own organization only
    if (user.role === 'OWNER' || user.role === 'COMPANY_OWNER') {
      if (!user.organizationId) {
        throw new ForbiddenException('Owner requires organization context');
      }
      // Cross-tenant organization admin APIs must require SUPER_ADMIN explicitly
      const isOrgAdminRoute =
        typeof request.url === 'string' &&
        (request.url.startsWith('/organization') || request.url.startsWith('/organization?'));
      if (isOrgAdminRoute && requiredPermissions.some((p) => p.startsWith('organization:'))) {
        // OWNER may read/update only their own org — enforced in controller/service for :id
        // List/create/delete all orgs remains SUPER_ADMIN-only via Roles decorator
        if (
          requiredPermissions.includes('organization:list') ||
          requiredPermissions.includes('organization:create') ||
          requiredPermissions.includes('organization:delete')
        ) {
          throw new ForbiddenException('Insufficient permissions');
        }
      }
      return true;
    }

    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, organizationId: true },
    });

    if (!userRecord || !userRecord.organizationId) {
      throw new ForbiddenException('User not found or missing organization');
    }

    const roleNames = ROLE_NAME_ALIASES[userRecord.role] || [userRecord.role];

    const roles = await this.prisma.role.findMany({
      where: {
        organizationId: userRecord.organizationId,
        name: { in: roleNames },
      },
    });

    const effectivePermissions = await this.permissionInheritance.getEffectivePermissions(
      user.id,
      userRecord.organizationId,
    );

    this.logger.debug(
      `Permission check for user ${user.id} (${userRecord.role}): Required [${requiredPermissions.join(', ')}], Effective [${effectivePermissions.join(', ')}]`,
    );

    if (effectivePermissions.includes('*')) {
      return true;
    }

    const hasAllRequired = requiredPermissions.every((perm) => effectivePermissions.includes(perm));

    if (!hasAllRequired) {
      const missing = requiredPermissions.filter((perm) => !effectivePermissions.includes(perm));
      this.logger.error(
        `Permission denied for user ${user.id} (${userRecord.role}): Missing permissions [${missing.join(', ')}]. Required: [${requiredPermissions.join(', ')}], Effective: [${effectivePermissions.join(', ')}]`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}