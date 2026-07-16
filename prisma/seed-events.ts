import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Event rules define: business event → auto-status-transition
// No hardcoded workflows. All data-driven.
const eventRules = {
  lead: [
    { eventType: 'created',              fromStatus: null,        toStatus: 'New' },
    { eventType: 'contacted',            fromStatus: 'New',       toStatus: 'Contacted' },
    { eventType: 'meeting.scheduled',    fromStatus: 'Contacted', toStatus: 'Meeting' },
    { eventType: 'survey.completed',     fromStatus: 'Meeting',   toStatus: 'Survey' },
    { eventType: 'drawing.2d-completed', fromStatus: 'Survey',    toStatus: 'Drawing' },
    { eventType: 'drawing.3d-completed', fromStatus: 'Drawing',   toStatus: 'BOQ' },
    { eventType: 'boq.generated',        fromStatus: 'BOQ',       toStatus: 'Quotation' },
    { eventType: 'quotation.sent',       fromStatus: 'Quotation', toStatus: 'QuotationSent' },
    { eventType: 'quotation.approved',   fromStatus: 'QuotationSent', toStatus: 'Negotiation' },
    { eventType: 'negotiation.completed', fromStatus: 'Negotiation', toStatus: 'Approved' },
    { eventType: 'payment.received',     fromStatus: 'Approved',  toStatus: 'Advance' },
    { eventType: 'project.created',      fromStatus: 'Advance',   toStatus: 'Converted' },
    { eventType: 'rejected',             fromStatus: null,        toStatus: 'Rejected' },
  ],
  customer: [
    { eventType: 'created',    fromStatus: null,   toStatus: 'Active' },
    { eventType: 'deactivated', fromStatus: 'Active', toStatus: 'Inactive' },
    { eventType: 'reactivated', fromStatus: 'Inactive', toStatus: 'Active' },
    { eventType: 'archived',   fromStatus: null,   toStatus: 'Archived' },
  ],
  project: [
    { eventType: 'created',               fromStatus: null,           toStatus: 'New' },
    { eventType: 'design.started',        fromStatus: 'New',          toStatus: 'DesignInProgress' },
    { eventType: 'design.approved',       fromStatus: 'DesignInProgress', toStatus: 'DesignApproved' },
    { eventType: 'fabrication.started',   fromStatus: 'DesignApproved', toStatus: 'Fabrication' },
    { eventType: 'fabrication.completed', fromStatus: 'Fabrication',  toStatus: 'DispatchReady' },
    { eventType: 'dispatched',            fromStatus: 'DispatchReady', toStatus: 'Dispatched' },
    { eventType: 'installation.started',  fromStatus: 'Dispatched',  toStatus: 'Installation' },
    { eventType: 'installation.completed', fromStatus: 'Installation', toStatus: 'Completed' },
    { eventType: 'put-on-hold',           fromStatus: null,           toStatus: 'OnHold' },
    { eventType: 'cancelled',              fromStatus: null,           toStatus: 'Cancelled' },
  ],
};

async function main() {
  const orgs = await prisma.organization.findMany({ take: 1 });
  if (!orgs.length) {
    console.error('No organizations found');
    process.exit(1);
  }

  const organizationId = orgs[0].id;

  // Clear existing rules
  await prisma.eventRule.deleteMany({ where: { organizationId } });
  console.log('Cleared existing event rules');

  let total = 0;
  for (const [entityType, rules] of Object.entries(eventRules)) {
    for (const rule of rules) {
      await prisma.eventRule.create({
        data: {
          organizationId,
          entityType,
          eventType: rule.eventType,
          fromStatus: rule.fromStatus,
          toStatus: rule.toStatus,
          isActive: true,
        },
      });
      total++;
    }
  }

  console.log(`Seeded ${total} event rules (lead: ${eventRules.lead.length}, customer: ${eventRules.customer.length}, project: ${eventRules.project.length})`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
