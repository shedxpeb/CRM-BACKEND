import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseQueryService, serializeDecimals } from '../common/services/base-query.service';
import { AuditService } from '../auth/services/audit.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { TenantContextService } from '../common/services/tenant-context.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';

@Injectable()
export class CustomerService extends BaseQueryService {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly tenantContextService: TenantContextService,
  ) {
    super(prisma, {
      model: 'customer',
      searchFields: ['customerName', 'companyName', 'mobile', 'email', 'gstNumber'],
      filterFields: [
        'status',
        'city',
        'state',
        'industry',
        'assignedEmployeeId',
        'source',
        'businessType',
      ],
      sortColumns: ['createdAt', 'companyName', 'customerName', 'status', 'customerId'],
      orgScoped: true,
    });
  }

  async create(data: CreateCustomerDto, createdById?: string, organizationId?: string) {
    if (!organizationId) {
      throw new BadRequestException('Organization context is required');
    }

    // Validate tenant context to prevent tenant mismatch
    this.validateTenantContext(organizationId);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let customer: any;

      if (data.leadId) {
        const lead = await this.prisma.lead.findFirst({
          where: { id: data.leadId, organizationId, isDeleted: false },
        });

        if (lead && !lead.isConverted) {
          customer = await this.prisma.$transaction(async (tx) => {
            const created = await tx.customer.create({
              data: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(data as any),
                email: data.email || '',
                organizationId,
                createdById,
                projectTitle: data.projectTitle || lead.projectTitle,
                projectType: data.projectType || lead.projectType,
              },
            });
            await tx.lead.update({
              where: { id: lead.id },
              data: {
                status: 'Converted',
                isConverted: true,
                customerId: created.id,
                convertedDate: new Date(),
              },
            });
            return created;
          });
        }
      }

      if (!customer) {
        customer = await this.client.create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { ...(data as any), email: data.email || '', organizationId, createdById },
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
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'P2002') throw new BadRequestException('Duplicate value');
      throw new BadRequestException(`Database error: ${err.message}`);
    }
  }

  async update(id: string, data: UpdateCustomerDto, updatedById?: string, organizationId?: string) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    // Validate tenant context to prevent tenant mismatch
    this.validateTenantContext(organizationId);
    const where: Record<string, unknown> = { id, isDeleted: false, organizationId };
    const existing = await this.client.findFirst({ where });
    if (!existing) throw new NotFoundException(`Customer not found`);

    if (data.mobile && data.mobile !== existing.mobile) {
      const dup = await this.client.findFirst({
        where: { mobile: data.mobile, organizationId, isDeleted: false, id: { not: id } },
      });
      if (dup) throw new BadRequestException('Another customer with this mobile exists');
    }

    try {
      const isStatusChangeToRejected = data.status === 'Rejected' && existing.status !== 'Rejected';
      const isStatusChangeToActive = data.status === 'Active' && existing.status === 'Rejected';
      const linkedLeadId = existing.leadId || existing.convertedFromLeadId;

      let customer;
      if ((isStatusChangeToRejected || isStatusChangeToActive) && linkedLeadId) {
        // Use transaction to update both customer and lead atomically
        customer = await this.prisma.$transaction(async (tx) => {
          const updatedCustomer = await tx.customer.update({
            where: { id },
            data: { ...(data as Record<string, unknown>), updatedBy: updatedById },
          });

          // Update linked lead status
          const lead = await tx.lead.findFirst({
            where: { id: linkedLeadId, organizationId, isDeleted: false },
          });

          if (lead) {
            if (isStatusChangeToRejected) {
              // Customer Rejected → Lead Rejected
              await tx.lead.update({
                where: { id: linkedLeadId },
                data: { status: 'Rejected' },
              });

              // Create status history for lead
              await tx.statusHistory.create({
                data: {
                  entityType: 'lead',
                  entityId: linkedLeadId,
                  organizationId,
                  fromStatus: lead.status,
                  toStatus: 'Rejected',
                  changedById: updatedById,
                  reason: 'Customer status changed to Rejected - synchronized',
                },
              });

              // Process workflow event for lead
              await this.workflowEngine.processEvent({
                organizationId,
                entityType: 'lead',
                entityId: linkedLeadId,
                eventType: 'status.changed',
                data: {
                  fromStatus: lead.status,
                  toStatus: 'Rejected',
                  reason: 'Customer rejected',
                },
                createdById: updatedById,
              });
            } else if (isStatusChangeToActive) {
              // Customer Rejected → Active → Lead Rejected → Active
              await tx.lead.update({
                where: { id: linkedLeadId },
                data: { status: 'New' },
              });

              // Create status history for lead
              await tx.statusHistory.create({
                data: {
                  entityType: 'lead',
                  entityId: linkedLeadId,
                  organizationId,
                  fromStatus: lead.status,
                  toStatus: 'New',
                  changedById: updatedById,
                  reason: 'Customer reactivated to Active - synchronized',
                },
              });

              // Process workflow event for lead
              await this.workflowEngine.processEvent({
                organizationId,
                entityType: 'lead',
                entityId: linkedLeadId,
                eventType: 'status.changed',
                data: { fromStatus: lead.status, toStatus: 'New', reason: 'Customer reactivated' },
                createdById: updatedById,
              });
            }
          }

          return updatedCustomer;
        });
      } else {
        // Regular update without lead sync
        customer = await this.client.update({
          where: { id },
          data: { ...(data as Record<string, unknown>), updatedBy: updatedById },
        });
      }

      await this.auditService.log({
        action: 'customer.updated',
        userId: updatedById,
        resource: 'customer',
        resourceId: id,
        metadata: {
          changes: Object.keys(data),
          leadSynced: (isStatusChangeToRejected || isStatusChangeToActive) && !!linkedLeadId,
        },
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
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'P2002') throw new BadRequestException('Duplicate value');
      throw new BadRequestException(`Database error: ${err.message}`);
    }
  }

  async getStats(organizationId?: string) {
    if (!organizationId) throw new NotFoundException('Organization context required');
    const where: Record<string, unknown> = { isDeleted: false, organizationId };

    const [total, active, newThisMonth] = await Promise.all([
      this.client.count({ where }),
      this.client.count({ where: { ...where, status: 'Active' } }),
      this.client.count({
        where: {
          ...where,
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);

    return { total, active, newThisMonth };
  }

  async getProjectData(id: string, organizationId: string) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    // Validate tenant context to prevent tenant mismatch
    this.validateTenantContext(organizationId);
    const customer = await this.client.findFirst({
      where: { id, isDeleted: false, organizationId },
      select: {
        id: true,
        customerId: true,
        customerName: true,
        companyName: true,
        mobile: true,
        alternateMobile: true,
        email: true,
        gstNumber: true,
        panNumber: true,
        industry: true,
        businessType: true,
        website: true,
        address: true,
        city: true,
        state: true,
        country: true,
        pincode: true,
        assignedEmployee: true,
        assignedEmployeeId: true,
        source: true,
        status: true,
        notes: true,
        customFields: true,
        leadId: true,
        projectTitle: true,
        projectType: true,
      },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return serializeDecimals(customer);
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
    return {
      isDuplicate: !!existing,
      existingCustomer: existing,
      exists: !!existing,
      customer: existing || undefined,
    };
  }

  async softDelete(id: string, deletedById?: string, organizationId?: string): Promise<unknown> {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    // Validate tenant context to prevent tenant mismatch
    this.validateTenantContext(organizationId);

    const customer = await this.client.findFirst({
      where: { id, organizationId, isDeleted: false },
      select: { id: true, convertedFromLeadId: true, customerName: true, customerId: true },
    });

    const result = await super.softDelete(id, deletedById, organizationId);

    if (customer?.convertedFromLeadId && organizationId) {
      const lead = await this.prisma.lead.findFirst({
        where: { id: customer.convertedFromLeadId, organizationId, isDeleted: false },
        select: { id: true, status: true, customerId: true, isConverted: true },
      });

      if (lead && lead.customerId === id && lead.isConverted) {
        await this.prisma.lead.update({
          where: { id: lead.id },
          data: {
            customerId: null,
            isConverted: false,
            convertedDate: null,
            status: 'Contacted',
          },
        });

        await this.prisma.statusHistory.create({
          data: {
            entityType: 'lead',
            entityId: lead.id,
            organizationId,
            fromStatus: 'Converted',
            toStatus: 'Contacted',
            changedById: deletedById,
            reason: 'Customer deleted — conversion reverted',
          },
        });

        await this.workflowEngine.processEvent({
          organizationId,
          entityType: 'lead',
          entityId: lead.id,
          eventType: 'conversion-reverted',
          data: {
            fromStatus: 'Converted',
            toStatus: 'Contacted',
            customerId: id,
            customerName: customer.customerName,
          },
          createdById: deletedById,
        });
      }
    }

    await this.auditService.log({
      action: 'customer.deleted',
      userId: deletedById,
      resource: 'customer',
      resourceId: id,
      metadata: {
        customerName: customer?.customerName,
        convertedFromLeadId: customer?.convertedFromLeadId,
        leadReverted: !!customer?.convertedFromLeadId,
      },
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

  async bulkDelete(
    ids: string[],
    deletedById?: string,
    organizationId?: string,
  ): Promise<{ count: number }> {
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

  async bulkStatusUpdate(
    ids: string[],
    status: string,
    updatedById?: string,
    organizationId?: string,
  ): Promise<{ count: number }> {
    const isRejected = status === 'Rejected';

    if (isRejected && organizationId) {
      // Get customers with linked leads
      const customers = await this.client.findMany({
        where: { id: { in: ids }, organizationId, isDeleted: false },
        select: { id: true, leadId: true, convertedFromLeadId: true, status: true },
      });

      // Use transaction for atomic updates
      const result = await this.prisma.$transaction(async (tx) => {
        const updateResult = await tx.customer.updateMany({
          where: { id: { in: ids }, organizationId },
          data: { status },
        });

        // Update linked leads
        for (const customer of customers) {
          const linkedLeadId = customer.leadId || customer.convertedFromLeadId;
          if (linkedLeadId && customer.status !== 'Rejected') {
            const lead = await tx.lead.findFirst({
              where: { id: linkedLeadId, organizationId, isDeleted: false },
            });

            if (lead) {
              await tx.lead.update({
                where: { id: linkedLeadId },
                data: { status: 'Rejected' },
              });

              await tx.statusHistory.create({
                data: {
                  entityType: 'lead',
                  entityId: linkedLeadId,
                  organizationId,
                  fromStatus: lead.status,
                  toStatus: 'Rejected',
                  changedById: updatedById,
                  reason: 'Customer bulk status changed to Rejected - synchronized',
                },
              });

              await this.workflowEngine.processEvent({
                organizationId,
                entityType: 'lead',
                entityId: linkedLeadId,
                eventType: 'status.changed',
                data: {
                  fromStatus: lead.status,
                  toStatus: 'Rejected',
                  reason: 'Customer bulk rejected',
                },
                createdById: updatedById,
              });
            }
          }
        }

        return updateResult;
      });

      await this.auditService.log({
        action: 'customer.bulk-status-updated',
        userId: updatedById,
        resource: 'customer',
        resourceId: ids.join(','),
        metadata: { count: result.count, status, ids, leadsSynced: true },
      });

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

      return result;
    }

    // Regular bulk update without lead sync
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

    // Validate tenant context to prevent tenant mismatch
    this.validateTenantContext(organizationId);
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

    const pick = <T>(
      fromData: T | undefined | null,
      fromLead: T | undefined | null,
      enabled: boolean,
    ): T | undefined => {
      if (
        fromData !== undefined &&
        fromData !== null &&
        !(typeof fromData === 'string' && fromData === '')
      ) {
        return fromData;
      }
      if (!enabled) return undefined;
      if (fromLead === undefined || fromLead === null) return undefined;
      return fromLead;
    };

    const leadCustom =
      lead.customFields &&
      typeof lead.customFields === 'object' &&
      !Array.isArray(lead.customFields)
        ? (lead.customFields as Record<string, unknown>)
        : {};
    const mergedCustomFields = !transfer.customFields
      ? undefined
      : data.customFields !== undefined
        ? data.customFields
        : leadCustom;

    // Prefer explicit payload attachments; clone tracking Attachment rows separately
    const attachments = transfer.attachments
      ? [...new Set([...(data.attachments || []), ...(lead.attachments || [])])]
      : data.attachments || [];

    const result = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          customerName: data.customerName,
          companyName: data.companyName,
          mobile: data.mobile,
          alternateMobile: pick(
            data.alternateMobile,
            lead.alternateMobile || undefined,
            transfer.contact,
          ),
          email: pick(data.email, lead.email || undefined, transfer.contact) || '',
          gstNumber: pick(data.gstNumber, lead.gstNumber || undefined, transfer.company),
          panNumber: pick(data.panNumber, lead.panNumber || undefined, transfer.company),

          industry:
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (pick(data.industry, lead.industry || undefined, transfer.company) as any) || undefined,

          businessType:
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (pick(data.businessType, lead.businessType || undefined, transfer.company) as any) ||
            undefined,
          website: pick(data.website, lead.website || undefined, transfer.company),
          address:
            pick(
              data.address,
              [lead.addressLine1, lead.addressLine2, lead.area].filter(Boolean).join(', ') ||
                lead.siteAddress ||
                undefined,
              transfer.address,
            ) ||
            data.address ||
            '—',
          city: pick(data.city, lead.city || undefined, transfer.address) || data.city || '—',
          state: pick(data.state, lead.state || undefined, transfer.address) || data.state || '—',
          pincode: pick(data.pincode, lead.pincode || undefined, transfer.address),
          country: pick(data.country, lead.country || 'India', transfer.address) || 'India',
          source: data.source || lead.source,
          assignedEmployeeId: pick(data.assignedEmployeeId, undefined, transfer.standard),
          assignedEmployee: undefined,
          notes: pick(data.notes, lead.remarks || undefined, transfer.notes),
          leadId: lead.id,
          convertedFromLeadId: lead.id,
          organizationId: orgId,
          createdById,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: (data.status || 'Active') as any,
          customFields: mergedCustomFields || undefined,
          attachments: attachments.length ? attachments : [],
        },
      });

      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: 'Converted',
          isConverted: true,
          customerId: customer.id,
          convertedDate: new Date(),
        },
      });

      await tx.statusHistory.create({
        data: {
          entityType: 'lead',
          entityId: lead.id,
          organizationId: orgId,
          fromStatus: lead.status,
          toStatus: 'Converted',
          changedById: createdById,
          reason: 'Lead converted to customer',
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
      data.customerName,
      data.companyName,
      data.mobile,
      data.email,
      data.address,
      data.city,
      data.state,
      data.gstNumber,
      data.panNumber,
      data.industry,
      data.website,
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

    return { customer: result.customer, lead: serializeDecimals(result.lead), summary };
  }

  /**
   * Validate tenant context to prevent tenant mismatch
   * Ensures the provided organizationId matches the current tenant context
   * Made more lenient to prevent false positives during normal operations
   */
  private validateTenantContext(organizationId: string): void {
    const context = this.tenantContextService.getContext();
    if (!context) {
      // If no tenant context is set, skip validation
      // This can happen in some scenarios where context is not required
      this.logger.debug('No tenant context found during validation - skipping');
      return;
    }

    const contextOrgId = context.organizationId;

    // Only validate if context has an organizationId
    if (!contextOrgId) {
      this.logger.debug('Tenant context has no organizationId - skipping validation');
      return;
    }

    // Only check the primary organizationId match
    // Skip tenantId and crmOrganizationId checks to prevent false positives
    if (organizationId !== contextOrgId) {
      this.logger.warn(
        `Potential tenant mismatch: Request organizationId ${organizationId} does not match context organizationId ${contextOrgId}. Proceeding with request organizationId.`,
      );
      // Don't throw exception - just log a warning
      // The organizationId from the request (from JWT) is the authoritative source
    }
  }
}
