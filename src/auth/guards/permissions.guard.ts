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

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'dashboard:view',
    'lead:list',
    'lead:read',
    'lead:create',
    'lead:update',
    'lead:delete',
    'lead:restore',
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
    'purchase-order:approve',
    'task:list',
    'task:read',
    'task:create',
    'task:update',
    'task:delete',
  ],
  COMPANY_OWNER: ['*'],
  EMPLOYEE: [
    'dashboard:view',
    'lead:list',
    'lead:read',
    'lead:create',
    'lead:update',
    'lead:delete',
    'lead:restore',
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
    'tracking:read',
    'tracking:update',
    'task:list',
    'task:read',
    'task:create',
    'task:update',
  ],
  SALES_MANAGER: [
    'dashboard:view',
    'lead:list',
    'lead:read',
    'lead:create',
    'lead:update',
    'lead:delete',
    'lead:restore',
    'customer:list',
    'customer:read',
    'customer:create',
    'customer:update',
    'customer:delete',
    'project:list',
    'project:read',
    'tracking:read',
    'tracking:update',
  ],
  SALES_EXECUTIVE: [
    'dashboard:view',
    'lead:list',
    'lead:read',
    'lead:create',
    'lead:update',
    'lead:delete',
    'lead:restore',
    'customer:list',
    'customer:read',
    'customer:create',
    'customer:update',
    'customer:delete',
    'project:list',
    'project:read',
    'tracking:read',
  ],
  PROJECT_MANAGER: [
    'dashboard:view',
    'project:list',
    'project:read',
    'project:create',
    'project:update',
    'project:delete',
    'customer:list',
    'customer:read',
    'tracking:read',
    'tracking:update',
  ],
  PURCHASE_MANAGER: [
    'dashboard:view',
    'purchase-order:list',
    'purchase-order:read',
    'purchase-order:create',
    'purchase-order:update',
    'purchase-order:approve',
    'vendor:list',
    'vendor:read',
    'vendor:create',
    'vendor:update',
    'inventory:list',
    'inventory:read',
    'inventory:create',
    'inventory:update',
  ],
  INVENTORY_MANAGER: [
    'dashboard:view',
    'inventory:list',
    'inventory:read',
    'inventory:create',
    'inventory:update',
    'inventory:delete',
    'item-master:list',
    'item-master:read',
    'item-master:create',
    'item-master:update',
    'warehouse:list',
    'warehouse:read',
    'tracking:read',
    'tracking:update',
  ],
  ACCOUNTANT: [
    'dashboard:view',
    'purchase-order:list',
    'purchase-order:read',
    'purchase-order:approve',
    'vendor:list',
    'vendor:read',
    'tracking:read',
  ],
  VIEW_ONLY: [
    'dashboard:view',
    'lead:list',
    'lead:read',
    'customer:list',
    'customer:read',
    'project:list',
    'project:read',
    'inventory:list',
    'inventory:read',
  ],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
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
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    const userPermissions = roles.flatMap((r) =>
      r.rolePermissions.map((rp) => rp.permission.key),
    );
    const effectivePermissions =
      userPermissions.length > 0 ? userPermissions : DEFAULT_PERMISSIONS[userRecord.role] || [];

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
