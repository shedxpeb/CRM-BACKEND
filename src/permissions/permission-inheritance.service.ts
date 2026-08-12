import { Injectable, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Permission Inheritance Service
 * 
 * Handles hierarchical permission system where:
 * - Super Admin grants permissions to Tenant Admin
 * - Tenant Admin can only delegate permissions they possess
 * - Roles can inherit from parent roles
 * - No permission escalation is possible
 */
@Injectable()
export class PermissionInheritanceService {
  private readonly logger = new Logger(PermissionInheritanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate effective permissions for a user considering:
   * - Direct role permissions
   * - Inherited permissions from parent roles
   * - Delegated permissions from Super Admin
   * - Module-level restrictions
   */
  async getEffectivePermissions(userId: string, organizationId: string): Promise<string[]> {
    // Check cache first
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        effectivePermissions: true,
        lastPermissionCalculation: true,
        permissionVersion: true,
        role: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // SUPER_ADMIN has all permissions
    if (user.role === 'SUPER_ADMIN') {
      return ['*'];
    }

    // OWNER has full access within their organization
    if (user.role === 'OWNER') {
      return await this.getOrganizationPermissionPool(organizationId);
    }

    // Check if cache is valid (5 minutes)
    const cacheValid = user.lastPermissionCalculation && 
      (Date.now() - user.lastPermissionCalculation.getTime()) < 5 * 60 * 1000;

    if (cacheValid && user.effectivePermissions) {
      const cachedPermissions = JSON.parse(user.effectivePermissions as string);
      return cachedPermissions;
    }

    // Calculate effective permissions
    const effectivePermissions = await this.calculateEffectivePermissions(userId, organizationId);

    // Update cache
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        effectivePermissions: JSON.stringify(effectivePermissions),
        lastPermissionCalculation: new Date(),
        permissionVersion: user.permissionVersion + 1,
      },
    });

    return effectivePermissions;
  }

  /**
   * Check if user has permission to delegate specific permission
   * Users can only delegate permissions they possess
   */
  async canDelegatePermission(userId: string, permissionKey: string, organizationId: string): Promise<boolean> {
    const userPermissions = await this.getEffectivePermissions(userId, organizationId);
    
    // SUPER_ADMIN can delegate any permission
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check if user has the permission
    return userPermissions.includes('*') || userPermissions.includes(permissionKey);
  }

  /**
   * Delegate permission to role with validation
   * Ensures delegator has the permission and permission is in organization's pool
   */
  async delegatePermissionToRole(
    delegatorId: string,
    roleId: string,
    permissionId: string,
    organizationId: string,
  ): Promise<void> {
    // Get delegator's permissions
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
      select: { key: true },
    });

    if (!permission) {
      throw new BadRequestException('Permission not found');
    }

    // Check if delegator can delegate this permission
    const canDelegate = await this.canDelegatePermission(delegatorId, permission.key, organizationId);
    if (!canDelegate) {
      throw new ForbiddenException('You do not have permission to delegate this permission');
    }

    // Check if permission is in organization's permission pool
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { permissionPool: true },
    });

    if (organization?.permissionPool) {
      const permissionPool = JSON.parse(organization.permissionPool as string);
      if (!permissionPool.includes(permission.key)) {
        throw new ForbiddenException('This permission is not in your organization\'s permission pool');
      }
    }

    // Check if role exists and belongs to organization
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId },
    });

    if (!role) {
      throw new BadRequestException('Role not found in your organization');
    }

    // Check hierarchy constraints
    if (role.inheritsFromId) {
      const parentPermissions = await this.getRoleEffectivePermissions(role.inheritsFromId, organizationId);
      if (!parentPermissions.includes(permission.key)) {
        throw new ForbiddenException('Cannot grant permission that parent role does not have');
      }
    }

    // Grant permission to role
    await this.prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
      create: {
        roleId,
        permissionId,
        grantedById: delegatorId,
      },
      update: {
        grantedById: delegatorId,
        grantedAt: new Date(),
      },
    });

    // Invalidate permission cache for all users with this role
    await this.invalidateRolePermissionCache(roleId);
  }

  /**
   * Create child role that inherits from parent role
   * Enforces hierarchy depth limits
   */
  async createChildRole(
    parentRoleId: string,
    dto: { name: string; code?: string; description?: string; permissions?: string[] },
    organizationId: string,
    createdById: string,
  ): Promise<any> {
    // Get parent role
    const parentRole = await this.prisma.role.findFirst({
      where: { id: parentRoleId, organizationId },
      select: { level: true, organizationId: true },
    });

    if (!parentRole) {
      throw new BadRequestException('Parent role not found');
    }

    // Check hierarchy depth limit
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { maxRoleDepth: true, roleHierarchyEnabled: true },
    });

    if (!organization?.roleHierarchyEnabled) {
      throw new ForbiddenException('Role hierarchy is not enabled for this organization');
    }

    if (parentRole.level >= organization.maxRoleDepth) {
      throw new ForbiddenException('Maximum role hierarchy depth reached');
    }

    // Create child role
    const childRole = await this.prisma.role.create({
      data: {
        organizationId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        permissions: dto.permissions || [],
        inheritsFromId: parentRoleId,
        level: parentRole.level + 1,
        createdById,
      },
    });

    return childRole;
  }

  /**
   * Validate that permissions don't exceed parent role permissions
   */
  async validatePermissionHierarchy(roleId: string, permissionIds: string[]): Promise<boolean> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { inheritsFromId: true, organizationId: true },
    });

    if (!role?.inheritsFromId) {
      return true; // No parent, no restrictions
    }

    const parentPermissions = await this.getRoleEffectivePermissions(role.inheritsFromId, role.organizationId || '');
    
    // Get permission keys for the requested permissions
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { key: true },
    });

    const permissionKeys = permissions.map(p => p.key);

    // Check if all requested permissions are in parent's permissions
    const hasAllPermissions = permissionKeys.every(key => 
      parentPermissions.includes(key) || parentPermissions.includes('*')
    );

    return hasAllPermissions;
  }

  /**
   * Get organization's permission pool (permissions granted by Super Admin)
   */
  async getOrganizationPermissionPool(organizationId: string): Promise<string[]> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { permissionPool: true },
    });

    if (!organization?.permissionPool) {
      return [];
    }

    return JSON.parse(organization.permissionPool as string);
  }

  /**
   * Calculate effective permissions for a user
   */
  private async calculateEffectivePermissions(userId: string, organizationId: string): Promise<string[]> {
    // Get user's roles
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, organizationId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (userRoles.length === 0) {
      return [];
    }

    // Collect all permissions from all roles
    const allPermissions = new Set<string>();

    for (const userRole of userRoles) {
      const rolePermissions = await this.getRoleEffectivePermissions(userRole.roleId, organizationId);
      rolePermissions.forEach(perm => allPermissions.add(perm));
    }

    // Apply module-level restrictions
    const finalPermissions = await this.applyModuleRestrictions(
      Array.from(allPermissions),
      organizationId,
    );

    return finalPermissions;
  }

  /**
   * Get effective permissions for a role including inherited permissions
   */
  public async getRoleEffectivePermissions(roleId: string, organizationId: string): Promise<string[]> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: {
        organizationId: true,
        permissions: true,
        inheritsFromId: true,
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return [];
    }

    // Start with direct permissions
    const permissions = new Set<string>();

    // Add explicit role permissions
    for (const rp of role.rolePermissions) {
      permissions.add(rp.permission.key);
    }

    // Add legacy permissions array for backward compatibility
    if (role.permissions) {
      role.permissions.forEach(perm => permissions.add(perm));
    }

    // Add inherited permissions from parent role
    if (role.inheritsFromId) {
      const parentPermissions = await this.getRoleEffectivePermissions(role.inheritsFromId, role.organizationId || '');
      parentPermissions.forEach(perm => permissions.add(perm));
    }

    return Array.from(permissions);
  }

  /**
   * Apply module-level restrictions to permissions
   */
  private async applyModuleRestrictions(permissions: string[], organizationId: string): Promise<string[]> {
    // Get enabled modules for organization
    const enabledModules = await this.prisma.organizationModule.findMany({
      where: { organizationId, enabled: true },
      select: { moduleKey: true, permissionSet: true },
    });

    const enabledModuleKeys = new Set(enabledModules.map(m => m.moduleKey));

    // Filter permissions based on enabled modules
    const filteredPermissions = permissions.filter(permission => {
      const moduleKey = permission.split('.')[0]; // e.g., "leads" from "leads.view"
      return enabledModuleKeys.has(moduleKey);
    });

    return filteredPermissions;
  }

  /**
   * Invalidate permission cache for all users with a specific role
   */
  private async invalidateRolePermissionCache(roleId: string): Promise<void> {
    // Get all users with this role
    const userRoles = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });

    // Invalidate cache for each user
    for (const userRole of userRoles) {
      await this.prisma.user.update({
        where: { id: userRole.userId },
        data: {
          lastPermissionCalculation: null, // Force recalculation
        },
      });
    }
  }

  /**
   * Invalidate permission cache for a specific user
   */
  async invalidateUserPermissionCache(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastPermissionCalculation: null,
      },
    });
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(userId: string, permissionKey: string, organizationId: string): Promise<boolean> {
    const effectivePermissions = await this.getEffectivePermissions(userId, organizationId);
    return effectivePermissions.includes('*') || effectivePermissions.includes(permissionKey);
  }

  /**
   * Get permission hierarchy for a role
   */
  async getRoleHierarchy(roleId: string): Promise<any[]> {
    const hierarchy: any[] = [];
    let currentRoleId: string | undefined = roleId;

    while (currentRoleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: currentRoleId },
        select: {
          id: true,
          name: true,
          code: true,
          level: true,
          inheritsFromId: true,
          organizationId: true,
        },
      });

      if (!role) break;

      hierarchy.push(role);
      currentRoleId = role.inheritsFromId;
    }

    return hierarchy;
  }
}