import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '../common/services/tenant-context.service';

const TENANT_SCOPED_MODELS = [
  'User',
  'Lead',
  'Customer',
  'Project',
  'Vendor',
  'InventoryItem',
  'InventoryCategory',
  'Warehouse',
  'StockMovement',
  'PurchaseOrder',
  'Supplier',
  'Task',
  'ItemMaster',
  'ItemVariant',
  'ItemBundle',
  'SalaryAdjustment',
  'Document',
  'AuditLog',
  'Role',
  'Permission',
  'UserRole',
  'OrganizationModule',
  'Session',
  'RefreshToken',
  'LoginAttempt',
  'OtpChallenge',
];

export function createTenantMiddleware(
  prisma: PrismaClient,
  tenantContextService: TenantContextService,
): any {
  return async (params: any, next: any) => {
    const context = tenantContextService.getContext();

    if (!context) {
      return next(params);
    }

    const { organizationId, isSuperAdmin, isImpersonation } = context;

    if (isSuperAdmin && !isImpersonation) {
      return next(params);
    }

    if (!organizationId) {
      return next(params);
    }

    const model = params.model;
    const action = params.action;

    if (!TENANT_SCOPED_MODELS.includes(model)) {
      return next(params);
    }

    const tenantFilter = { organizationId };

    if (params.args?.where) {
      params.args.where = {
        AND: [params.args.where, tenantFilter],
      };
    } else {
      params.args.where = tenantFilter;
    }

    if (action === 'create' || action === 'createMany') {
      const data = params.args.data;

      if (Array.isArray(data)) {
        params.args.data = data.map((item) => ({
          ...item,
          organizationId,
        }));
      } else if (data) {
        params.args.data = {
          ...data,
          organizationId,
        };
      }
    }

    if (action === 'update' || action === 'updateMany') {
      if (params.args?.data) {
        const { organizationId: _orgId, ...rest } = params.args.data;
        params.args.data = rest;
      }
    }

    return next(params);
  };
}
