import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';

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

    // SUPER_ADMIN can do everything
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // OWNER can do everything within their org
    if (user.role === 'OWNER') {
      return true;
    }

    // For other roles, check the user's effective permissions from their role
    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        organization: {
          include: {
            users: {
              where: { id: user.id },
            },
          },
        },
      },
    });

    if (!userRecord) {
      throw new ForbiddenException('User not found');
    }

    // Get all roles matching this user's role
    const roles = await this.prisma.role.findMany({
      where: {
        organizationId: userRecord.organizationId || '',
        name: { in: [userRecord.role] },
      },
    });

    const userPermissions = roles.flatMap((r) => r.permissions);

    const hasAllRequired = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasAllRequired) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
