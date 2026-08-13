import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionInheritanceService } from '../../permissions/permission-inheritance.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Module Access Guard
 *
 * Enforces module-level access control:
 * - Checks if module is enabled for organization
 * - Validates user has required permissions for module
 * - Prevents access to disabled modules
 */
@Injectable()
export class ModuleAccessGuard implements CanActivate {
  private readonly logger = new Logger(ModuleAccessGuard.name);

  // Module permissions mapping based on HTTP method and endpoint patterns
  private readonly modulePermissionMap = {
    // Dashboard module
    dashboard: {
      GET: ['dashboard.view'],
    },
    // Lead module
    leads: {
      GET: ['lead:list', 'lead:read'],
      POST: ['lead:create'],
      PUT: ['lead:update'],
      PATCH: ['lead:update'],
      DELETE: ['lead:delete'],
    },
    // Customer module
    customers: {
      GET: ['customer:list', 'customer:read'],
      POST: ['customer:create'],
      PUT: ['customer:update'],
      PATCH: ['customer:update'],
      DELETE: ['customer:delete'],
    },
    // Project module
    projects: {
      GET: ['project:list', 'project:read'],
      POST: ['project:create'],
      PUT: ['project:update'],
      PATCH: ['project:update'],
      DELETE: ['project:delete'],
    },
    // Inventory module
    inventory: {
      GET: ['inventory:list', 'inventory:read'],
      POST: ['inventory:create'],
      PUT: ['inventory:update'],
      PATCH: ['inventory:update'],
      DELETE: ['inventory:delete'],
    },
    // Purchase orders module
    'purchase-orders': {
      GET: ['purchase-order:list', 'purchase-order:read'],
      POST: ['purchase-order:create'],
      PUT: ['purchase-order:update'],
      PATCH: ['purchase-order:update'],
      DELETE: ['purchase-order:delete'],
    },
    // Users module
    users: {
      GET: ['user:list', 'user:read'],
      POST: ['user:create'],
      PUT: ['user:update'],
      PATCH: ['user:update'],
      DELETE: ['user:delete'],
    },
    // Roles module
    roles: {
      GET: ['role:list', 'role:read'],
      POST: ['role:create'],
      PUT: ['role:update'],
      PATCH: ['role:update'],
      DELETE: ['role:delete'],
    },
    // Tasks module
    tasks: {
      GET: ['task:list', 'task:read'],
      POST: ['task:create'],
      PUT: ['task:update'],
      PATCH: ['task:update'],
      DELETE: ['task:delete'],
    },
    // Reports module
    reports: {
      GET: ['report:list', 'report:read'],
      POST: ['report:export'],
    },
    // Vendors module
    vendors: {
      GET: ['vendor:list', 'vendor:read'],
      POST: ['vendor:create'],
      PUT: ['vendor:update'],
      PATCH: ['vendor:update'],
      DELETE: ['vendor:delete'],
    },
  };

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private permissionInheritance: PermissionInheritanceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    // SUPER_ADMIN bypasses module restrictions
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // OWNER has full access within their organization
    if (user.role === 'OWNER') {
      return true;
    }

    const url = request.url;
    const method = request.method;

    // Skip module checks for auth endpoints
    if (url.startsWith('/auth') || url.startsWith('/api/auth')) {
      return true;
    }

    // Extract module key from URL
    const moduleKey = this.extractModuleKey(url);
    if (!moduleKey) {
      // No module-specific access required
      return true;
    }

    // Dashboard is a core module and should always be accessible
    if (moduleKey === 'dashboard') {
      return true;
    }

    // If this is not a known module (no permissions defined), skip module enablement check
    const isKnownModule = moduleKey in this.modulePermissionMap;
    if (!isKnownModule) {
      return true;
    }

    // Check if module is enabled for organization
    const moduleAccess = await this.prisma.organizationModule.findUnique({
      where: {
        organizationId_moduleKey: {
          organizationId: user.organizationId,
          moduleKey,
        },
      },
    });

    if (!moduleAccess || !moduleAccess.enabled) {
      this.logger.warn(
        `Module ${moduleKey} not accessible for organization ${user.organizationId}`,
      );
      throw new ForbiddenException(`Module ${moduleKey} is not accessible`);
    }

    // Get required permissions for this module and method
    const requiredPermissions = this.getRequiredPermissions(moduleKey, method, url);
    if (requiredPermissions.length === 0) {
      // No specific permissions required for this endpoint
      return true;
    }

    // Get user's effective permissions
    const userPermissions = await this.permissionInheritance.getEffectivePermissions(
      user.id,
      user.organizationId,
    );

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(
      (perm) => userPermissions.includes('*') || userPermissions.includes(perm),
    );

    if (!hasAllPermissions) {
      this.logger.warn(
        `User ${user.id} lacks required permissions ${requiredPermissions.join(', ')} for module ${moduleKey}`,
      );
      throw new ForbiddenException('Insufficient permissions for this module');
    }

    return true;
  }

  /**
   * Extract module key from URL
   * Examples:
   * /leads -> leads
   * /customers/123 -> customers
   * /api/projects -> projects
   * /lead -> leads (normalized to plural)
   * /customer -> customers (normalized to plural)
   */
  private extractModuleKey(url: string): string | null {
    // Remove query parameters and trailing slashes
    const cleanUrl = url.split('?')[0].replace(/\/$/, '');

    // Extract first path segment after /api/ if present
    const segments = cleanUrl.split('/').filter(Boolean);

    if (segments.length === 0) return null;

    // Skip 'api' segment if present
    const startIndex = segments[0] === 'api' ? 1 : 0;

    if (startIndex >= segments.length) return null;

    let moduleKey = segments[startIndex];

    // Normalize module key (replace hyphens with underscores)
    moduleKey = moduleKey.replace(/-/g, '_');

    // Normalize singular to plural for known modules
    const singularToPlural: Record<string, string> = {
      lead: 'leads',
      customer: 'customers',
      user: 'users',
      role: 'roles',
      task: 'tasks',
      project: 'projects',
      vendor: 'vendors',
      report: 'reports',
    };

    return singularToPlural[moduleKey] || moduleKey;
  }

  /**
   * Get required permissions for a module based on HTTP method and URL
   */
  private getRequiredPermissions(moduleKey: string, method: string, url: string): string[] {
    // Get base permissions for module and method
    const modulePermissions = this.modulePermissionMap[moduleKey];
    if (!modulePermissions) {
      return [];
    }

    const methodPermissions = modulePermissions[method.toUpperCase()];
    if (!methodPermissions) {
      return [];
    }

    // Check for special actions in URL
    if (url.includes('/approve') || url.includes('/approve')) {
      return [`${moduleKey}.approve`];
    }

    if (url.includes('/export') || url.includes('/export')) {
      return [`${moduleKey}.export`];
    }

    if (url.includes('/import') || url.includes('/import')) {
      return [`${moduleKey}.import`];
    }

    if (url.includes('/manage') || url.includes('/manage')) {
      return [`${moduleKey}.manage`];
    }

    return methodPermissions;
  }

  /**
   * Check if a specific module is enabled for an organization
   */
  async isModuleEnabled(organizationId: string, moduleKey: string): Promise<boolean> {
    const moduleAccess = await this.prisma.organizationModule.findUnique({
      where: {
        organizationId_moduleKey: {
          organizationId,
          moduleKey,
        },
      },
    });

    return moduleAccess?.enabled || false;
  }

  /**
   * Get all enabled modules for an organization
   */
  async getEnabledModules(organizationId: string): Promise<string[]> {
    const enabledModules = await this.prisma.organizationModule.findMany({
      where: {
        organizationId,
        enabled: true,
      },
      select: {
        moduleKey: true,
      },
    });

    return enabledModules.map((m) => m.moduleKey);
  }

  /**
   * Get module-specific permissions for an organization
   */
  async getModulePermissions(organizationId: string, moduleKey: string): Promise<string[]> {
    const moduleAccess = await this.prisma.organizationModule.findUnique({
      where: {
        organizationId_moduleKey: {
          organizationId,
          moduleKey,
        },
      },
      select: {
        settings: true,
      },
    });

    if (!moduleAccess?.settings) {
      // Return default permissions for module
      return this.getDefaultModulePermissions(moduleKey);
    }

    // Try to extract permissionSet from settings if it exists
    const settings = moduleAccess.settings as Record<string, unknown>;
    if (settings.permissionSet && typeof settings.permissionSet === 'string') {
      try {
        return JSON.parse(settings.permissionSet) as string[];
      } catch {
        // If parsing fails, return default permissions
        return this.getDefaultModulePermissions(moduleKey);
      }
    }

    return this.getDefaultModulePermissions(moduleKey);
  }

  /**
   * Get default permissions for a module
   */
  private getDefaultModulePermissions(moduleKey: string): string[] {
    const modulePermissions = this.modulePermissionMap[moduleKey];
    if (!modulePermissions) {
      return [];
    }

    // Return all unique permissions for the module
    const allPermissions = new Set<string>();
    Object.values(modulePermissions).forEach((permissions: string[]) => {
      permissions.forEach((perm) => allPermissions.add(perm));
    });

    return Array.from(allPermissions);
  }
}
