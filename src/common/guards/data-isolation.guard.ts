import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { Reflector } from '@nestjs/core';

/**
 * Data Isolation Guard
 * 
 * Enforces multi-tenant data isolation by:
 * - Validating resource ownership
 * - Preventing cross-tenant data access
 * - Ensuring organization context is respected
 * - Validating user has access to requested resources
 */
@Injectable()
export class DataIsolationGuard implements CanActivate {
  private readonly logger = new Logger(DataIsolationGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private reflector: Reflector,
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

    // SUPER_ADMIN bypasses data isolation
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Ensure organization context exists
    if (!user.organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    // Validate no organizationId manipulation in request
    this.validateNoOrganizationIdManipulation(request);

    // Extract resource ID from request if applicable
    const resourceId = this.extractResourceId(request);
    if (resourceId) {
      const hasAccess = await this.validateResourceOwnership(
        resourceId,
        user.organizationId,
        user.id,
        request.route.path,
      );

      if (!hasAccess) {
        this.logger.warn(
          `Data isolation violation: User ${user.id} attempted to access resource ${resourceId} in organization ${user.organizationId}`,
        );
        throw new ForbiddenException('Resource not found or access denied');
      }
    }

    return true;
  }

  /**
   * Validate that user has access to the requested resource
   */
  private async validateResourceOwnership(
    resourceId: string,
    organizationId: string,
    userId: string,
    routePath: string,
  ): Promise<boolean> {
    try {
      // Determine resource type based on route path
      const resourceType = this.determineResourceType(routePath);

      // Validate ownership based on resource type
      switch (resourceType) {
        case 'lead':
          return await this.validateLeadOwnership(resourceId, organizationId);
        case 'customer':
          return await this.validateCustomerOwnership(resourceId, organizationId);
        case 'project':
          return await this.validateProjectOwnership(resourceId, organizationId);
        case 'user':
          return await this.validateUserOwnership(resourceId, organizationId);
        case 'role':
          return await this.validateRoleOwnership(resourceId, organizationId);
        case 'task':
          return await this.validateTaskOwnership(resourceId, organizationId);
        default:
          // For unknown resource types, allow access (will be validated by business logic)
          return true;
      }
    } catch (error) {
      this.logger.error(`Error validating resource ownership: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate lead ownership
   */
  private async validateLeadOwnership(leadId: string, organizationId: string): Promise<boolean> {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId,
        isDeleted: false,
      },
    });

    return !!lead;
  }

  /**
   * Validate customer ownership
   */
  private async validateCustomerOwnership(customerId: string, organizationId: string): Promise<boolean> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId,
        isDeleted: false,
      },
    });

    return !!customer;
  }

  /**
   * Validate project ownership
   */
  private async validateProjectOwnership(projectId: string, organizationId: string): Promise<boolean> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    return !!project;
  }

  /**
   * Validate user ownership (user must belong to same organization)
   */
  private async validateUserOwnership(targetUserId: string, organizationId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        organizationId,
        isDeleted: false,
      },
    });

    return !!user;
  }

  /**
   * Validate role ownership (role must belong to organization)
   */
  private async validateRoleOwnership(roleId: string, organizationId: string): Promise<boolean> {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        organizationId,
        isDeleted: false,
      },
    });

    return !!role;
  }

  /**
   * Validate task ownership
   */
  private async validateTaskOwnership(taskId: string, organizationId: string): Promise<boolean> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId,
      },
    });

    return !!task;
  }

  /**
   * Determine resource type from route path
   */
  private determineResourceType(routePath: string): string {
    const path = routePath.toLowerCase();

    if (path.includes('/lead')) return 'lead';
    if (path.includes('/customer')) return 'customer';
    if (path.includes('/project')) return 'project';
    if (path.includes('/user')) return 'user';
    if (path.includes('/role')) return 'role';
    if (path.includes('/task')) return 'task';

    return 'unknown';
  }

  /**
   * Extract resource ID from request
   */
  private extractResourceId(request: any): string | null {
    // Check route parameters
    if (request.params && request.params.id) {
      return request.params.id;
    }

    // Check request body for common ID fields
    if (request.body) {
      const idFields = ['id', 'leadId', 'customerId', 'projectId', 'userId', 'roleId', 'taskId'];
      for (const field of idFields) {
        if (request.body[field]) {
          return request.body[field];
        }
      }
    }

    return null;
  }

  /**
   * Validate no organizationId manipulation in request
   */
  private validateNoOrganizationIdManipulation(request: any): void {
    const body = request.body;
    const query = request.query;

    // Check body for organizationId
    if (body && body.organizationId) {
      this.logger.warn(
        `organizationId manipulation attempt in body by user ${request.user?.id}`,
      );
      delete body.organizationId;
    }

    // Check query for organizationId
    if (query && query.organizationId) {
      this.logger.warn(
        `organizationId manipulation attempt in query by user ${request.user?.id}`,
      );
      delete query.organizationId;
    }
  }
}