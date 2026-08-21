import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionInheritanceService } from '../permissions/permission-inheritance.service';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionInheritance: PermissionInheritanceService,
  ) {}

  async findAll(organizationId: string) {
    return this.prisma.role.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: { createdAt: 'asc' },
      include: {
        inheritsFrom: {
          select: { id: true, name: true, code: true },
        },
        rolePermissions: {
          include: {
            permission: {
              select: { id: true, key: true, label: true, module: true, action: true },
            },
          },
        },
      },
    });
  }

  async findById(organizationId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId, isDeleted: false },
      include: {
        inheritsFrom: {
          select: { id: true, name: true, code: true },
        },
        rolePermissions: {
          include: {
            permission: {
              select: { id: true, key: true, label: true, module: true, action: true },
            },
          },
        },
      },
    });
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
    return role;
  }

  async createWithHierarchy(organizationId: string, dto: CreateRoleDto, createdById: string) {
    // Check if role name already exists
    const existing = await this.prisma.role.findFirst({
      where: { organizationId, name: dto.name, isDeleted: false },
    });
    if (existing) throw new BadRequestException(`Role "${dto.name}" already exists`);

    // Validate parent role if specified
    if (dto.inheritsFromId) {
      const parentRole = await this.prisma.role.findFirst({
        where: { id: dto.inheritsFromId, organizationId, isDeleted: false },
      });
      if (!parentRole) {
        throw new BadRequestException('Parent role not found');
      }

      // Check hierarchy depth
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { maxRoleDepth: true, roleHierarchyEnabled: true },
      });

      if (!organization?.roleHierarchyEnabled) {
        throw new ForbiddenException('Role hierarchy is not enabled for this organization');
      }

      if (parentRole.level >= (organization?.maxRoleDepth || 5)) {
        throw new ForbiddenException('Maximum role hierarchy depth reached');
      }

      // Validate permissions against parent role
      if (dto.permissions && dto.permissions.length > 0) {
        const isValidHierarchy = await this.permissionInheritance.validatePermissionHierarchy(
          dto.inheritsFromId,
          dto.permissions,
        );
        if (!isValidHierarchy) {
          throw new ForbiddenException('Cannot grant permissions that parent role does not have');
        }
      }
    }

    // Create role
    const parentRole = dto.inheritsFromId
      ? await this.prisma.role.findUnique({
          where: { id: dto.inheritsFromId },
          select: { level: true },
        })
      : null;

    const role = await this.prisma.role.create({
      data: {
        organizationId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        permissions: dto.permissions || [],
        inheritsFromId: dto.inheritsFromId,
        level: parentRole ? parentRole.level + 1 : 0,
        createdById,
      },
    });

    // Create explicit permission mappings if provided
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      for (const permissionId of dto.permissionIds) {
        await this.prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId,
            grantedById: createdById,
          },
        });
      }
    }

    return this.findById(organizationId, role.id);
  }

  async create(organizationId: string, dto: CreateRoleDto, createdById: string) {
    // Use the enhanced creation method
    return this.createWithHierarchy(organizationId, dto, createdById);
  }

  async updatePermissions(
    organizationId: string,
    id: string,
    permissionIds: string[],
    updatedById: string,
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId, isDeleted: false },
    });
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
    if (role.isSystem) throw new BadRequestException('System roles cannot be modified');

    // Validate permissions against parent role if exists
    if (role.inheritsFromId && permissionIds.length > 0) {
      const isValidHierarchy = await this.permissionInheritance.validatePermissionHierarchy(
        role.inheritsFromId,
        permissionIds,
      );
      if (!isValidHierarchy) {
        throw new ForbiddenException('Cannot grant permissions that parent role does not have');
      }
    }

    // Delete existing permission mappings
    await this.prisma.rolePermission.deleteMany({
      where: { roleId: id },
    });

    // Create new permission mappings
    for (const permissionId of permissionIds) {
      await this.prisma.rolePermission.create({
        data: {
          roleId: id,
          permissionId,
          grantedById: updatedById,
        },
      });
    }

    // Update legacy permissions array for backward compatibility
    const permissions = await this.prisma.rolePermission.findMany({
      where: { roleId: id },
      include: { permission: true },
    });

    const permissionKeys = permissions.map((rp) => rp.permission.key);

    await this.prisma.role.update({
      where: { id },
      data: { permissions: permissionKeys },
    });

    // Invalidate permission cache for all users with this role
    await this.invalidateRoleCache(id);

    return this.findById(organizationId, id);
  }

  async update(organizationId: string, id: string, dto: UpdateRoleDto) {
    const existing = await this.prisma.role.findFirst({
      where: { id, organizationId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException(`Role with ID ${id} not found`);
    if (existing.isSystem) throw new BadRequestException('System roles cannot be modified');

    // Validate parent role change
    if (dto.inheritsFromId && dto.inheritsFromId !== existing.inheritsFromId) {
      const parentRole = await this.prisma.role.findFirst({
        where: { id: dto.inheritsFromId, organizationId, isDeleted: false },
      });
      if (!parentRole) {
        throw new BadRequestException('Parent role not found');
      }

      // Check hierarchy depth
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { maxRoleDepth: true },
      });

      if (parentRole.level >= (organization?.maxRoleDepth || 5)) {
        throw new ForbiddenException('Maximum role hierarchy depth reached');
      }
    }

    // Update role
    await this.prisma.role.update({
      where: { id },
      data: {
        ...dto,
        name: dto.name || existing.name,
        inheritsFromId: dto.inheritsFromId,
      },
    });

    // Update level based on parent
    if (dto.inheritsFromId) {
      const parentRole = await this.prisma.role.findUnique({
        where: { id: dto.inheritsFromId },
        select: { level: true },
      });
      if (parentRole) {
        await this.prisma.role.update({
          where: { id },
          data: { level: parentRole.level + 1 },
        });
      }
    }

    // Invalidate cache
    await this.invalidateRoleCache(id);

    return this.findById(organizationId, id);
  }

  async delete(organizationId: string, id: string) {
    const existing = await this.prisma.role.findFirst({
      where: { id, organizationId, isDeleted: false },
    });
    if (!existing) throw new NotFoundException(`Role with ID ${id} not found`);
    if (existing.isSystem) throw new BadRequestException('System roles cannot be deleted');

    // Check if role has child roles
    const childRoles = await this.prisma.role.findMany({
      where: { inheritsFromId: id, isDeleted: false },
    });
    if (childRoles.length > 0) {
      throw new BadRequestException(
        'Cannot delete role with child roles. Please delete child roles first.',
      );
    }

    // Check if role is assigned to users
    const userRoles = await this.prisma.userRoleAssignment.findMany({
      where: { roleId: id },
    });
    if (userRoles.length > 0) {
      throw new BadRequestException(
        'Cannot delete role assigned to users. Please unassign users first.',
      );
    }

    // Soft delete
    await this.prisma.role.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return { message: 'Role deleted successfully' };
  }

  async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedById: string,
    organizationId: string,
  ) {
    // Validate role exists and belongs to organization
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId, isDeleted: false },
    });
    if (!role) throw new NotFoundException('Role not found');

    // Check if user belongs to organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    if (user?.organizationId !== organizationId) {
      throw new BadRequestException('User does not belong to this organization');
    }

    // Check if assignment already exists
    const existing = await this.prisma.userRoleAssignment.findFirst({
      where: { userId, roleId, organizationId },
    });
    if (existing) {
      throw new BadRequestException('Role already assigned to user');
    }

    // Assign role
    await this.prisma.userRoleAssignment.create({
      data: {
        userId,
        roleId,
        organizationId,
        assignedById,
      },
    });

    // Invalidate user's permission cache
    await this.permissionInheritance.invalidateUserPermissionCache(userId);

    return { message: 'Role assigned successfully' };
  }

  async removeRoleFromUser(userId: string, roleId: string, organizationId: string) {
    const userRole = await this.prisma.userRoleAssignment.findFirst({
      where: { userId, roleId, organizationId },
    });
    if (!userRole) throw new NotFoundException('Role assignment not found');

    await this.prisma.userRoleAssignment.delete({
      where: { id: userRole.id },
    });

    // Invalidate user's permission cache
    await this.permissionInheritance.invalidateUserPermissionCache(userId);

    return { message: 'Role removed successfully' };
  }

  async getRoleWithEffectivePermissions(roleId: string, organizationId: string) {
    const role = await this.findById(organizationId, roleId);

    // Get effective permissions including inherited
    const effectivePermissions = await this.permissionInheritance.getRoleEffectivePermissions(
      roleId,
      organizationId,
    );

    return {
      ...role,
      effectivePermissions,
    };
  }

  async getUserRoles(userId: string, organizationId: string) {
    const userRoles = await this.prisma.userRoleAssignment.findMany({
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

    return userRoles.map((ur) => ({
      ...ur,
      role: {
        ...ur.role,
        effectivePermissions: ur.role.permissions,
      },
    }));
  }

  private async invalidateRoleCache(roleId: string) {
    // Get all users with this role
    const userRoles = await this.prisma.userRoleAssignment.findMany({
      where: { roleId },
      select: { userId: true },
    });

    // Invalidate cache for each user
    for (const userRole of userRoles) {
      await this.permissionInheritance.invalidateUserPermissionCache(userRole.userId);
    }
  }
}
