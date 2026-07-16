import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseQueryService } from '../common/services/base-query.service';
import { AuditService } from '../auth/services/audit.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';

@Injectable()
export class CustomerService extends BaseQueryService {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {
    super(prisma, {
      model: 'customer',
      searchFields: ['customerName', 'companyName', 'mobile', 'email', 'gstNumber'],
      filterFields: ['status', 'city', 'state', 'industry', 'assignedEmployeeId', 'source', 'businessType'],
      sortColumns: ['createdAt', 'companyName', 'customerName', 'status', 'customerId'],
      orgScoped: true,
    });
  }

  async create(data: CreateCustomerDto, createdById?: string, organizationId?: string) {
    if (!organizationId) {
      throw new BadRequestException('Organization context is required');
    }

    const existingMobile = await this.client.findFirst({
      where: { mobile: data.mobile, organizationId, isDeleted: false },
    });
    if (existingMobile) {
      throw new BadRequestException('Customer with this mobile already exists');
    }

    if (data.email) {
      const existingEmail = await this.client.findFirst({
        where: { email: data.email, organizationId, isDeleted: false },
      });
      if (existingEmail) {
        throw new BadRequestException('Customer with this email already exists');
      }
    }

    try {
      let customer: any;

      if (data.leadId) {
        const lead = await this.prisma.lead.findFirst({
          where: { id: data.leadId, organizationId, isDeleted: false },
        });

        if (lead && !lead.isConverted) {
          customer = await this.prisma.$transaction(async (tx) => {
            const created = await tx.customer.create({
              data: { ...data as any, email: data.email || '', organizationId, createdById },
            });
            await tx.lead.update({
              where: { id: lead.id },
              data: { status: 'Converted' as any, isConverted: true, customerId: created.id, convertedDate: new Date() },
            });
            return created;
          });
        }
      }

      if (!customer) {
        customer = await this.client.create({
          data: { ...data as any, email: data.email || '', organizationId, createdById },
        });
      }

      await this.auditService.log({
        action: 'customer.created',
        organizationId,
        userId: createdById,
        resource: 'customer',
        resourceId: customer.id,
        metadata: { customerName: data.customerName, companyName: data.companyName },
      });

      await this.workflowEngine.processEvent({
        organizationId,
        entityType: 'customer',
        entityId: customer.id,
        eventType: 'created',
        data: { customerName: data.customerName, companyName: data.companyName },
        createdById,
      });

      return customer;
    } catch (error: any) {
      if (error.code === 'P2002') throw new BadRequestException('Duplicate value');
      throw new BadRequestException(`Database error: ${error.message}`);
    }
  }

  async update(id: string, data: UpdateCustomerDto, updatedById?: string, organizationId?: string) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    const where: any = { id, isDeleted: false, organizationId };
    const existing = await this.client.findFirst({ where });
    if (!existing) throw new NotFoundException(`Customer not found`);

    if (data.mobile && data.mobile !== existing.mobile) {
      const dup = await this.client.findFirst({
        where: { mobile: data.mobile, organizationId, isDeleted: false, id: { not: id } },
      });
      if (dup) throw new BadRequestException('Another customer with this mobile exists');
    }

    try {
      const customer = await this.client.update({ where: { id }, data: { ...data as any, updatedBy: updatedById } });
      await this.auditService.log({
        action: 'customer.updated',
        userId: updatedById,
        resource: 'customer',
        resourceId: id,
        metadata: { changes: Object.keys(data) },
      });
      await this.workflowEngine.processEvent({
        organizationId,
        entityType: 'customer',
        entityId: id,
        eventType: 'updated',
        data: { changes: Object.keys(data) },
        createdById: updatedById,
      });
      return customer;
    } catch (error: any) {
      if (error.code === 'P2002') throw new BadRequestException('Duplicate value');
      throw new BadRequestException(`Database error: ${error.message}`);
    }
  }

  async getStats(organizationId?: string) {
    const where: any = { isDeleted: false };
    if (organizationId) where.organizationId = organizationId;

    const [total, active, newThisMonth] = await Promise.all([
      this.client.count({ where }),
      this.client.count({ where: { ...where, status: 'Active' } }),
      this.client.count({
        where: { ...where, createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      }),
    ]);

    return { total, active, newThisMonth };
  }

  async getActivities(id: string, organizationId: string) {
    const activities = await this.prisma.auditLog.findMany({
      where: { resource: 'customer', resourceId: id, organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return activities;
  }

  async checkDuplicate(mobile: string, email: string, organizationId: string) {
    const existing = await this.prisma.customer.findFirst({
      where: {
        organizationId,
        OR: [{ mobile }, ...(email ? [{ email }] : [])],
        isDeleted: false,
      },
    });
    return { isDuplicate: !!existing, existingCustomer: existing, exists: !!existing, customer: existing || undefined };
  }

  async softDelete(id: string, deletedById?: string, organizationId?: string): Promise<any> {
    const result = await super.softDelete(id, deletedById, organizationId);
    await this.auditService.log({
      action: 'customer.deleted',
      userId: deletedById,
      resource: 'customer',
      resourceId: id,
    });
    await this.workflowEngine.processEvent({
      organizationId,
      entityType: 'customer',
      entityId: id,
      eventType: 'deleted',
      createdById: deletedById,
    });
    return result;
  }

  async bulkDelete(ids: string[], deletedById?: string, organizationId?: string): Promise<{ count: number }> {
    const result = await super.bulkDelete(ids, deletedById, organizationId);
    await this.auditService.log({
      action: 'customer.bulk-deleted',
      userId: deletedById,
      resource: 'customer',
      resourceId: ids.join(','),
      metadata: { count: result.count, ids },
    });
    if (organizationId) {
      for (const id of ids) {
        await this.workflowEngine.processEvent({
          organizationId,
          entityType: 'customer',
          entityId: id,
          eventType: 'bulk-deleted',
          data: { count: result.count },
          createdById: deletedById,
        });
      }
    }
    return result;
  }

  async bulkStatusUpdate(ids: string[], status: string, updatedById?: string, organizationId?: string): Promise<{ count: number }> {
    const result = await super.bulkStatusUpdate(ids, status, organizationId);
    await this.auditService.log({
      action: 'customer.bulk-status-updated',
      userId: updatedById,
      resource: 'customer',
      resourceId: ids.join(','),
      metadata: { count: result.count, status, ids },
    });
    if (organizationId) {
      for (const id of ids) {
        await this.workflowEngine.processEvent({
          organizationId,
          entityType: 'customer',
          entityId: id,
          eventType: 'bulk-status-updated',
          data: { status, count: result.count },
          createdById: updatedById,
        });
      }
    }
    return result;
  }

  async convertLead(data: ConvertLeadDto, createdById?: string, organizationId?: string) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    const lead = await this.prisma.lead.findFirst({
      where: { id: data.leadId, organizationId, isDeleted: false },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.isConverted) throw new BadRequestException('Lead already converted');

    const orgId = organizationId;
    const existingMobile = await this.client.findFirst({
      where: { mobile: data.mobile, organizationId: orgId, isDeleted: false },
    });
    if (existingMobile) throw new BadRequestException('Customer with this mobile already exists');

    const transfer = {
      standard: true,
      contact: true,
      company: true,
      address: true,
      notes: true,
      comments: true,
      activities: true,
      timeline: true,
      attachments: true,
      documents: true,
      followups: true,
      customFields: true,
      tags: true,
      ...(data.transferOptions || {}),
    };

    const pick = <T,>(
      fromData: T | undefined | null,
      fromLead: T | undefined | null,
      enabled: boolean,
    ): T | undefined => {
      if (fromData !== undefined && fromData !== null && !(typeof fromData === 'string' && fromData === '')) {
        return fromData;
      }
      if (!enabled) return undefined;
      if (fromLead === undefined || fromLead === null) return undefined;
      return fromLead;
    };

    const leadCustom =
      lead.customFields && typeof lead.customFields === 'object' && !Array.isArray(lead.customFields)
        ? (lead.customFields as Record<string, any>)
        : {};
    const mergedCustomFields = !transfer.customFields
      ? undefined
      : (data.customFields !== undefined ? data.customFields : leadCustom);

    // Prefer explicit payload attachments; clone tracking Attachment rows separately
    const attachments = transfer.attachments
      ? [...new Set([...(data.attachments || []), ...(lead.attachments || [])])]
      : (data.attachments || []);

    const result = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          customerName: data.customerName,
          companyName: data.companyName,
          mobile: data.mobile,
          alternateMobile: pick(data.alternateMobile, lead.alternateMobile || undefined, transfer.contact),
          email: pick(data.email, lead.email || undefined, transfer.contact) || '',
          gstNumber: pick(data.gstNumber, lead.gstNumber || undefined, transfer.company),
          panNumber: pick(data.panNumber, lead.panNumber || undefined, transfer.company),
          industry: (pick(data.industry, lead.industry as any, transfer.company) as any) || undefined,
          businessType: pick(data.businessType, lead.businessType || undefined, transfer.company),
          website: pick(data.website, lead.website || undefined, transfer.company),
          address:
            pick(
              data.address,
              [lead.addressLine1, lead.addressLine2, lead.area].filter(Boolean).join(', ') || lead.siteAddress || undefined,
              transfer.address,
            ) || data.address || '—',
          city: pick(data.city, lead.city || undefined, transfer.address) || data.city || '—',
          state: pick(data.state, lead.state || undefined, transfer.address) || data.state || '—',
          pincode: pick(data.pincode, lead.pincode || undefined, transfer.address),
          country: pick(data.country, lead.country || 'India', transfer.address) || 'India',
          source: data.source || lead.source,
          assignedEmployeeId: pick(data.assignedEmployeeId, lead.assignedToId || undefined, transfer.standard),
          assignedEmployee: transfer.standard ? lead.assignedTo : undefined,
          notes: pick(data.notes, lead.remarks || undefined, transfer.notes),
          leadId: lead.id,
          convertedFromLeadId: lead.id,
          organizationId: orgId,
          createdById,
          status: (data.status as any) || ('Active' as any),
          customFields: mergedCustomFields || undefined,
          attachments: attachments.length ? attachments : [],
        },
      });

      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: 'Converted' as any,
          isConverted: true,
          customerId: customer.id,
          convertedDate: new Date(),
        },
      });

      let clonedComments = 0;
      if (transfer.comments) {
        const comments = await tx.comment.findMany({
          where: { entityType: 'lead', entityId: lead.id, organizationId: orgId, isDeleted: false },
        });
        for (const c of comments) {
          await tx.comment.create({
            data: {
              organizationId: orgId,
              entityType: 'customer',
              entityId: customer.id,
              content: c.content,
              authorId: c.authorId,
              parentId: null,
            },
          });
          clonedComments++;
        }
      }

      let clonedAttachmentRows = 0;
      if (transfer.attachments) {
        const files = await tx.attachment.findMany({
          where: { entityType: 'lead', entityId: lead.id, organizationId: orgId, isDeleted: false },
        });
        for (const f of files) {
          await tx.attachment.create({
            data: {
              organizationId: orgId,
              entityType: 'customer',
              entityId: customer.id,
              fileName: f.fileName,
              originalName: f.originalName,
              mimeType: f.mimeType,
              size: f.size,
              url: f.url,
              category: f.category,
              uploadedById: f.uploadedById,
            },
          });
          clonedAttachmentRows++;
        }
      }

      return {
        customer,
        lead: updatedLead,
        clonedComments,
        clonedAttachments: attachments.length + clonedAttachmentRows,
      };
    });

    const customFieldCount = mergedCustomFields ? Object.keys(mergedCustomFields).length : 0;
    const standardFieldCount = [
      data.customerName, data.companyName, data.mobile, data.email, data.address,
      data.city, data.state, data.gstNumber, data.panNumber, data.industry, data.website,
    ].filter((v) => v !== undefined && v !== null && v !== '').length;

    const summary = {
      transferred: {
        standardFields: standardFieldCount,
        customFields: customFieldCount,
        documents: 0,
        attachments: result.clonedAttachments,
        activities: transfer.activities || transfer.timeline ? 1 : 0,
        comments: result.clonedComments,
        notes: !!result.customer.notes,
        tags: Array.isArray(data.tags) && transfer.tags ? data.tags.length : 0,
      },
      destinationId: result.customer.id,
      destinationCode: result.customer.customerId
        ? `CUS-${String(result.customer.customerId).padStart(6, '0')}`
        : null,
      destinationName: result.customer.customerName,
      sourceId: lead.id,
      conversionContext: data.conversionContext || null,
      profileId: data.profileId || null,
    };

    await this.auditService.log({
      action: 'lead.converted-to-customer',
      organizationId: orgId,
      userId: createdById,
      resource: 'customer',
      resourceId: result.customer.id,
      metadata: {
        leadNumber: lead.leadNumber,
        customerName: data.customerName,
        companyName: data.companyName,
        summary: summary.transferred,
        profileId: data.profileId,
      },
    });

    if (transfer.timeline || transfer.activities) {
      await this.workflowEngine.processEvent({
        organizationId: orgId,
        entityType: 'lead',
        entityId: lead.id,
        eventType: 'converted',
        data: {
          toStatus: 'Converted',
          customerName: result.customer.customerName,
          customerCode: summary.destinationCode,
          summary: summary.transferred,
        },
        createdById,
      });

      await this.workflowEngine.processEvent({
        organizationId: orgId,
        entityType: 'customer',
        entityId: result.customer.id,
        eventType: 'converted-from-lead',
        data: {
          leadNumber: lead.leadNumber,
          leadCode: `LD-${String(lead.leadNumber).padStart(6, '0')}`,
          customerName: data.customerName,
          summary: summary.transferred,
          conversionContext: data.conversionContext,
        },
        createdById,
      });
    }

    return { customer: result.customer, lead: result.lead, summary };
  }
}
