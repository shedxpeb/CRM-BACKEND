/**
 * Enterprise timeline helpers — business language only, no DB IDs in UI payloads.
 */

const NOISE_ACTIONS = [
  'token',
  'refresh',
  'heartbeat',
  'poll',
  'cache',
  'sync',
  'session.touch',
  'autosave',
  'auto.save',
];

const EVENT_TITLE_MAP: Record<string, string> = {
  created: 'Created',
  updated: 'Information Updated',
  deleted: 'Deleted',
  'manual.status-change': 'Status Changed',
  'status.changed': 'Status Changed',
  converted: 'Converted to Customer',
  'converted-from-lead': 'Created from Lead Conversion',
  'lead.converted': 'Lead Converted to Customer',
  'lead.converted-to-customer': 'Lead Converted to Customer',
  'comment.added': 'Comment Added',
  'attachment.added': 'Attachment Added',
  'approval.requested': 'Approval Requested',
  'approval.approved': 'Approved',
  'approval.rejected': 'Rejected',
  archived: 'Archived',
  activated: 'Activated',
  closed: 'Closed',
};

const ENTITY_LABELS: Record<string, string> = {
  lead: 'Lead',
  customer: 'Customer',
  project: 'Project',
  document: 'Document',
  quotation: 'Quotation',
  estimate: 'Estimate',
  proposal: 'Proposal',
  inventory: 'Inventory',
  item: 'Item',
  invoice: 'Invoice',
  payment: 'Payment',
  expense: 'Expense',
  vendor: 'Vendor',
  task: 'Task',
  'bank-account': 'Bank Account',
};

export function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] || titleCase(entityType.replace(/[-_]/g, ' '));
}

export function formatDisplayCode(entityType: string, businessNumber?: number | string | null, fallbackCode?: string | null): string | null {
  if (fallbackCode && typeof fallbackCode === 'string' && fallbackCode.trim()) return fallbackCode.trim();
  if (businessNumber === null || businessNumber === undefined || businessNumber === '') return null;
  const num = String(businessNumber).replace(/\D/g, '') || String(businessNumber);
  const padded = num.padStart(6, '0');
  const prefix: Record<string, string> = {
    lead: 'LD',
    customer: 'CUS',
    project: 'PRJ',
    quotation: 'QTN',
    estimate: 'EST',
    proposal: 'PRP',
    invoice: 'INV',
    payment: 'PAY',
    expense: 'EXP',
    vendor: 'VND',
    inventory: 'INVY',
    item: 'ITM',
    task: 'TSK',
    boq: 'BOQ',
    dispatch: 'DSP',
    warranty: 'WAR',
    po: 'PO',
    'bank-account': 'BNK',
  };
  return `${prefix[entityType] || entityType.toUpperCase().slice(0, 3)}-${padded}`;
}

export function humanizeEventTitle(entityType: string, rawAction: string): string {
  const cleaned = (rawAction || '')
    .replace(new RegExp(`^${entityType}\\.`, 'i'), '')
    .replace(/^manual\./i, 'manual.')
    .trim();

  const mapped = EVENT_TITLE_MAP[cleaned] || EVENT_TITLE_MAP[rawAction];
  if (mapped) {
    if (mapped === 'Created' || mapped === 'Deleted' || mapped === 'Information Updated' || mapped === 'Archived' || mapped === 'Activated' || mapped === 'Closed') {
      return `${entityLabel(entityType)} ${mapped}`;
    }
    if (mapped === 'Status Changed') return `${entityLabel(entityType)} Status Changed`;
    return mapped;
  }

  // Strip technical dots/dashes → business title
  const words = cleaned
    .replace(/[._-]+/g, ' ')
    .replace(/\bmanual\b/gi, '')
    .replace(/\bstatus change\b/gi, 'Status Changed')
    .replace(/\s+/g, ' ')
    .trim();

  const titled = titleCase(words);
  if (!titled) return `${entityLabel(entityType)} Activity`;
  if (/^(created|updated|deleted)$/i.test(titled)) return `${entityLabel(entityType)} ${titled}`;
  return titled;
}

export function isNoiseAction(action: string): boolean {
  const lower = (action || '').toLowerCase();
  return NOISE_ACTIONS.some((n) => lower.includes(n));
}

export function titleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Never leak these keys to UI */
const INTERNAL_KEYS = new Set([
  'id',
  'organizationId',
  'entityId',
  'entityType',
  'userId',
  'createdById',
  'updatedById',
  'deletedById',
  'changedById',
  'authorId',
  'approverId',
  'requestedById',
  'uploadedById',
  'sessionId',
  'workflowId',
  'pipelineId',
  'eventId',
  'statusId',
  'approvalId',
  'attachmentId',
  'commentId',
  'ruleId',
  'leadId',
  'customerId',
  'projectId',
  'alreadyNearStatusChange',
  'userAgent',
  'password',
  'token',
]);

const FIELD_LABELS: Record<string, string> = {
  toStatus: 'New Status',
  fromStatus: 'Previous Status',
  status: 'Status',
  reason: 'Reason',
  companyName: 'Company',
  customerName: 'Customer',
  projectName: 'Project',
  projectTitle: 'Project',
  quotationNumber: 'Quotation',
  invoiceNumber: 'Invoice',
  amount: 'Amount',
  totalAmount: 'Amount',
  grandTotal: 'Amount',
  mobile: 'Mobile',
  email: 'Email',
  city: 'City',
  state: 'State',
  notes: 'Notes',
  ipAddress: 'IP Address',
  message: 'Message',
};

export function labelForField(key: string): string {
  return FIELD_LABELS[key] || titleCase(key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' '));
}

export function sanitizeDetails(raw: Record<string, unknown> | null | undefined): { label: string; value: string }[] {
  if (!raw || typeof raw !== 'object') return [];
  const rows: { label: string; value: string }[] = [];

  for (const [key, value] of Object.entries(raw)) {
    if (INTERNAL_KEYS.has(key)) continue;
    if (key === 'changes' && value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [ck, cv] of Object.entries(value as Record<string, unknown>)) {
        if (INTERNAL_KEYS.has(ck)) continue;
        rows.push({ label: labelForField(ck), value: formatBusinessValue(cv) });
      }
      continue;
    }
    if (key === 'summary' && value && typeof value === 'object' && !Array.isArray(value)) {
      const s = value as Record<string, unknown>;
      if (s.standardFields != null) rows.push({ label: 'Standard Fields', value: String(s.standardFields) });
      if (s.customFields != null) rows.push({ label: 'Custom Fields', value: String(s.customFields) });
      if (s.documents != null) rows.push({ label: 'Documents', value: String(s.documents) });
      if (s.attachments != null) rows.push({ label: 'Attachments', value: String(s.attachments) });
      if (s.activities != null) rows.push({ label: 'Activities', value: String(s.activities) });
      if (s.comments != null) rows.push({ label: 'Comments', value: String(s.comments) });
      if (s.notes) rows.push({ label: 'Notes', value: 'Transferred' });
      if (s.tags != null && Number(s.tags) > 0) rows.push({ label: 'Tags', value: String(s.tags) });
      continue;
    }
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'object') continue;
    if (looksLikeUuid(String(value))) continue;
    rows.push({ label: labelForField(key), value: formatBusinessValue(value) });
  }
  return rows;
}

export function formatBusinessValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (value > 100) {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
    }
    return value.toLocaleString('en-IN');
  }
  const str = String(value);
  if (looksLikeUuid(str)) return '—';
  return str;
}

export function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    || /^[0-9a-f]{24}$/i.test(value);
}

export type TimelineCard = {
  id: string;
  type: 'status_change' | 'created' | 'updated' | 'activity' | 'comment' | 'attachment' | 'approval';
  title: string;
  description: string;
  timestamp: string;
  performedBy: string | null;
  performedByRole: string | null;
  department: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  details: { label: string; value: string }[];
  relatedRecords: { label: string; value: string; code?: string | null }[];
  displayCode?: string | null;
  entityLabel?: string;
};
