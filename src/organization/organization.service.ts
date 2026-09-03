import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeModuleKey } from '../common/utils/module-key.util';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { QuotationTemplateDefaults } from '../quotation/interfaces/quotation-template-defaults.interface';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.organization.findMany({
      where: { isDeleted: false },
      include: { _count: { select: { users: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, isDeleted: false },
      include: {
        _count: { select: { users: true, leads: true, customers: true, projects: true } },
      },
    });
    if (!org) throw new NotFoundException(`Organization with ID ${id} not found`);
    return org;
  }

  /**
   * Returns the module enablement state for an organization. Canonical (singular)
   * module keys are used so consumers can match permission prefixes. If the org
   * has no module configuration rows at all (legacy org), every known module is
   * treated as enabled — mirroring the module-access guard's default behavior.
   */
  async getModules(organizationId: string, userId?: string) {
    const rows = await this.prisma.organizationModule.findMany({
      where: { organizationId },
      select: { moduleKey: true, enabled: true },
    });

    // Apply per-user module overrides (UserModuleAccess) so the sidebar and
    // route guards reflect the requesting user's effective module access:
    // deny wins over the org default, allow re-enables a disabled module.
    const userOverrides = userId
      ? await this.prisma.userModuleAccess.findMany({
          where: { userId, organizationId },
          select: { moduleKey: true, allowed: true },
        })
      : [];
    const userDenied = new Set(
      userOverrides.filter((o) => !o.allowed).map((o) => normalizeModuleKey(o.moduleKey)),
    );
    const userAllowed = new Set(
      userOverrides.filter((o) => o.allowed).map((o) => normalizeModuleKey(o.moduleKey)),
    );

    const baseRows =
      rows.length === 0
        ? []
        : rows.map((row) => ({
            moduleKey: normalizeModuleKey(row.moduleKey),
            enabled: row.enabled,
          }));

    const allKeys = new Set<string>([
      ...baseRows.map((r) => r.moduleKey),
      ...userDenied,
      ...userAllowed,
    ]);
    const result = Array.from(allKeys).map((moduleKey) => {
      const base = baseRows.find((r) => r.moduleKey === moduleKey);
      // Legacy org with no module rows: everything defaults to enabled.
      let enabled = base ? base.enabled : true;
      if (userDenied.has(moduleKey)) enabled = false;
      if (userAllowed.has(moduleKey)) enabled = true;
      return { moduleKey, enabled };
    });

    return result;
  }

  async create(dto: CreateOrganizationDto, createdById?: string) {
    return this.prisma.organization.create({
      data: { ...dto, createdById },
    });
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    const existing = await this.prisma.organization.findFirst({ where: { id, isDeleted: false } });
    if (!existing) throw new NotFoundException(`Organization with ID ${id} not found`);
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  async softDelete(id: string) {
    const existing = await this.prisma.organization.findFirst({ where: { id, isDeleted: false } });
    if (!existing) throw new NotFoundException(`Organization with ID ${id} not found`);
    return this.prisma.organization.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async getQuotationTemplateDefaults(organizationId: string): Promise<QuotationTemplateDefaults> {
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, isDeleted: false },
    }) as any;
    if (!org) throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    return (org.quotationTemplateDefaults as QuotationTemplateDefaults) || {};
  }

  async updateQuotationTemplateDefaults(
    organizationId: string,
    defaults: QuotationTemplateDefaults,
  ): Promise<QuotationTemplateDefaults> {
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, isDeleted: false },
    });
    if (!org) throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { quotationTemplateDefaults: defaults as any },
    }) as any;
    
    return updated.quotationTemplateDefaults as QuotationTemplateDefaults;
  }
}
