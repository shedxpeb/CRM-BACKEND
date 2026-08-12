import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Organization Isolation Middleware
 * 
 * Ensures multi-tenant data isolation by:
 * - Validating organizationId from JWT (never trust frontend)
 * - Preventing organizationId manipulation in requests
 * - Injecting organization context into requests
 * - Logging potential security violations
 */
@Injectable()
export class OrganizationIsolationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(OrganizationIsolationMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Skip middleware for public routes
    if (this.isPublicRoute(req.path)) {
      return next();
    }

    const user = (req as any).user;

    if (!user) {
      // No user context, skip validation (will be handled by auth guards)
      return next();
    }

    // SUPER_ADMIN bypasses organization isolation
    if (user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Ensure organizationId is present for non-super-admin users
    if (!user.organizationId) {
      this.logger.warn(`User ${user.id} missing organizationId context`);
      throw new ForbiddenException('Organization context required');
    }

    // Check for organizationId manipulation in request body/query
    this.validateNoOrganizationIdManipulation(req);

    // Inject organization context for downstream use
    (req as any).organizationContext = {
      id: user.organizationId,
      userId: user.id,
      role: user.role,
    };

    next();
  }

  /**
   * Check if route is public (doesn't require organization isolation)
   */
  private isPublicRoute(path: string): boolean {
    const publicRoutes = [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/verify-otp',
      '/health',
      '/favicon.ico',
    ];

    return publicRoutes.some(route => path.startsWith(route));
  }

  /**
   * Validate that organizationId is not being manipulated in request
   */
  private validateNoOrganizationIdManipulation(req: Request): void {
    const body = req.body as any;
    const query = req.query as any;

    // Check body for organizationId
    if (body && body.organizationId) {
      this.logger.warn(
        `organizationId manipulation attempt in body by user ${(req as any).user?.id}`,
      );
      delete body.organizationId;
    }

    // Check query for organizationId
    if (query && query.organizationId) {
      this.logger.warn(
        `organizationId manipulation attempt in query by user ${(req as any).user?.id}`,
      );
      delete query.organizationId;
    }

    // Check for common organization manipulation patterns
    const suspiciousPatterns = [
      'organizationId',
      'orgId',
      'tenantId',
      'companyId',
      'organization_id',
      'org_id',
      'tenant_id',
      'company_id',
    ];

    for (const pattern of suspiciousPatterns) {
      if (body && body[pattern]) {
        this.logger.warn(
          `Suspicious pattern ${pattern} detected in request body by user ${(req as any).user?.id}`,
        );
        delete body[pattern];
      }

      if (query && query[pattern]) {
        this.logger.warn(
          `Suspicious pattern ${pattern} detected in request query by user ${(req as any).user?.id}`,
        );
        delete query[pattern];
      }
    }
  }
}