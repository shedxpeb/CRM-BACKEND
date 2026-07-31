export class DocumentDashboardDto {
  totalDocuments: number;
  estimates: number;
  proposals: number;
  quotations: number;
  invoices: number;
  draft: number;
  approved: number;
  sent: number;
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  recentDocuments: RecentDocumentDto[];
  recentActivity: DocumentActivityDto[];
}

export class RecentDocumentDto {
  id: string;
  documentNumber: string;
  documentType: string;
  customerName: string;
  projectName?: string;
  totalAmount?: number;
  status: string;
  createdBy?: string;
  createdAt: Date;
}

export class DocumentActivityDto {
  id: string;
  documentId: string;
  documentNumber?: string;
  type: string;
  description: string;
  performedBy?: string;
  performedAt: Date;
}
