import { ForbiddenException } from '@nestjs/common';
import { BaseQueryService } from './base-query.service';
import { PrismaService } from '../../prisma/prisma.service';

class TestQueryService extends BaseQueryService {
  constructor(prisma: PrismaService) {
    super(prisma, {
      model: 'lead',
      searchFields: ['customerName'],
      filterFields: ['status'],
      sortColumns: ['createdAt'],
      orgScoped: true,
    });
  }

  exposeRequireOrg(org?: string) {
    return this.requireOrganizationId(org);
  }
}

describe('BaseQueryService org isolation', () => {
  const prisma = {} as PrismaService;
  const svc = new TestQueryService(prisma);

  it('throws when orgScoped and organizationId missing', () => {
    expect(() => svc.exposeRequireOrg(undefined)).toThrow(ForbiddenException);
    expect(() => svc.exposeRequireOrg('')).toThrow(ForbiddenException);
  });

  it('returns organizationId when provided', () => {
    expect(svc.exposeRequireOrg('org-123')).toBe('org-123');
  });
});
