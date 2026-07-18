import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/** Map JWT UserRole enum values to Role.name records stored in DB */
const ROLE_NAME_ALIASES: Record<string, string[]> = {
  SUPER_ADMIN: ['SUPER_ADMIN', 'Super Admin', 'SuperAdmin'],
  OWNER: ['OWNER', 'Owner'],
  ADMIN: ['ADMIN', 'Admin'],
  EMPLOYEE: ['EMPLOYEE', 'Employee'],
};

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'lead:list',
    'lead:read',
    'lead:create',
    'lead:update',
    'lead:delete',
    'customer:list',
    'customer:read',
    'customer:create',
    'customer:update',
    'customer:delete',
    'project:list',
    'project:read',
    'project:create',
    'project:update',
    'project:delete',
    'item-master:list',
    'item-master:read',
    'item-master:create',
    'item-master:update',
    'item-master:delete',
    'inventory:list',
    'inventory:read',
    'inventory:create',
    'inventory:update',
    'inventory:delete',
    'user:list',
    'user:read',
    'user:create',
    'user:update',
    'role:list',
    'role:read',
    'organization:read',
    'organization:update',
    'tracking:read',
    'tracking:update',
  ],
  EMPLOYEE: [
    'lead:list',
    'lead:read',
    'lead:create',
    'lead:update',
    'customer:list',
    'customer:read',
    'customer:create',
    'customer:update',
    'project:list',
    'project:read',
    'project:update',
    'item-master:list',
    'item-master:read',
    'item-master:create',
    'item-master:update',
    'inventory:list',
    'inventory:read',
    'inventory:create',
    'inventory:update',
    'tracking:read',
    'tracking:update',
  ],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    // Tenant OWNER: full access within own organization only
    if (user.role === 'OWNER') {
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

    const userPermissions = roles.flatMap((r) => r.permissions);
    const effectivePermissions =
      userPermissions.length > 0 ? userPermissions : DEFAULT_PERMISSIONS[userRecord.role] || [];

    if (effectivePermissions.includes('*')) {
      return true;
    }

    const hasAllRequired = requiredPermissions.every((perm) => effectivePermissions.includes(perm));

    if (!hasAllRequired) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
