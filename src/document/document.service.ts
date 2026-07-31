import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentDashboardDto, RecentDocumentDto, DocumentActivityDto } from './dto/document-dashboard.dto';

@Injectable()
export class DocumentService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(organizationId: string, page: number = 1, pageSize: number = 25) {
    const skip = (page - 1) * pageSize;
    
    const [attachments, total] = await Promise.all([
      this.prisma.attachment.findMany({
        where: { organizationId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.attachment.count({
        where: { organizationId, isDeleted: false },
      }),
    ]);

    const documents = attachments.map((att) => ({
      id: att.id,
      documentNumber: att.originalName || att.fileName,
      documentType: att.entityType || 'Document',
      customerName: att.entityId || '-',
      projectName: undefined,
      totalAmount: undefined,
      status: att.category || 'Draft',
      createdBy: att.uploadedById || undefined,
      createdAt: att.createdAt,
    }));

    return {
      data: documents,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getDashboard(organizationId: string): Promise<DocumentDashboardDto> {
    // Aggregate counts from Attachments (generic document store) grouped
    // by entityType (= document type) and by category (= status).
    const attachments = await this.prisma.attachment.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const typeCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    let totalDocuments = 0;
    let estimates = 0;
    let proposals = 0;
    let quotations = 0;
    let invoices = 0;
    let draft = 0;
    let approved = 0;
    let sent = 0;

    for (const att of attachments) {
      const docType = att.entityType || 'Document';
      const docStatus = att.category || 'Draft';

      totalDocuments++;
      typeCounts[docType] = (typeCounts[docType] || 0) + 1;
      statusCounts[docStatus] = (statusCounts[docStatus] || 0) + 1;

      if (docType === 'Estimate' || docType === 'estimate') estimates++;
      else if (docType === 'Proposal' || docType === 'proposal') proposals++;
      else if (docType === 'Quotation' || docType === 'quotation') quotations++;
      else if (docType === 'Invoice' || docType === 'invoice') invoices++;

      if (docStatus === 'Draft' || docStatus === 'draft') draft++;
      else if (docStatus === 'Approved' || docStatus === 'approved' || docStatus === 'Accepted' || docStatus === 'accepted') approved++;
      else if (docStatus === 'Sent' || docStatus === 'sent') sent++;
    }

    // Build recent documents list from the same data.
    const recentDocuments: RecentDocumentDto[] = attachments.slice(0, 10).map((att) => ({
      id: att.id,
      documentNumber: att.originalName || att.fileName,
      documentType: att.entityType || 'Document',
      customerName: att.entityId || '-',
      projectName: undefined,
      totalAmount: undefined,
      status: att.category || 'Draft',
      createdBy: att.uploadedById || undefined,
      createdAt: att.createdAt,
    }));

    return {
      totalDocuments,
      estimates,
      proposals,
      quotations,
      invoices,
      draft,
      approved,
      sent,
      statusCounts,
      typeCounts,
      recentDocuments,
      recentActivity: [],
    };
  }
}
