import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const leadPipeline = [
  { status: 'New',            label: 'New',            order: 1, isInitial: true,  isFinal: false, allowedTransitions: ['Contacted', 'Rejected'],                                          color: '#6b7280' },
  { status: 'Contacted',      label: 'Contacted',      order: 2, isInitial: false, isFinal: false, allowedTransitions: ['DesignPending', 'Rejected', 'Converted'],                     color: '#3b82f6' },
  { status: 'DesignPending',  label: 'Design Pending', order: 3, isInitial: false, isFinal: false, allowedTransitions: ['BOQPending', 'Rejected'],                                      color: '#8b5cf6' },
  { status: 'BOQPending',     label: 'BOQ Pending',    order: 4, isInitial: false, isFinal: false, allowedTransitions: ['EstimateSent', 'Rejected'],                                    color: '#f59e0b' },
  { status: 'EstimateSent',   label: 'Estimate Sent',  order: 5, isInitial: false, isFinal: false, allowedTransitions: ['ProposalSent', 'Negotiation', 'Rejected'],                     color: '#10b981' },
  { status: 'ProposalSent',   label: 'Proposal Sent',  order: 6, isInitial: false, isFinal: false, allowedTransitions: ['Negotiation', 'Approved', 'Rejected'],                         color: '#06b6d4' },
  { status: 'Negotiation',    label: 'Negotiation',    order: 7, isInitial: false, isFinal: false, allowedTransitions: ['Approved', 'Rejected'],                                        color: '#f97316' },
  { status: 'Approved',       label: 'Approved',       order: 8, isInitial: false, isFinal: false, allowedTransitions: ['Converted', 'Rejected'],                                       color: '#22c55e' },
  { status: 'Rejected',       label: 'Rejected',       order: 9, isInitial: false, isFinal: true,  allowedTransitions: [],                                                             color: '#ef4444' },
  { status: 'Converted',      label: 'Converted',      order: 10, isInitial: false, isFinal: true, allowedTransitions: [],                                                              color: '#14b8a6' },
];

const customerPipeline = [
  { status: 'Active',     label: 'Active',     order: 1, isInitial: true,  isFinal: false, allowedTransitions: ['Inactive', 'Archived'],  color: '#22c55e' },
  { status: 'Inactive',   label: 'Inactive',   order: 2, isInitial: false, isFinal: false, allowedTransitions: ['Active', 'Archived'],    color: '#f59e0b' },
  { status: 'Archived',   label: 'Archived',   order: 3, isInitial: false, isFinal: true,  allowedTransitions: [],                       color: '#6b7280' },
];

const projectPipeline = [
  { status: 'New',              label: 'New',               order: 1,  isInitial: true,  isFinal: false, allowedTransitions: ['DesignInProgress', 'OnHold', 'Cancelled'],                           color: '#6b7280' },
  { status: 'DesignInProgress', label: 'Design In Progress', order: 2,  isInitial: false, isFinal: false, allowedTransitions: ['DesignApproved', 'OnHold', 'Cancelled'],                           color: '#3b82f6' },
  { status: 'DesignApproved',   label: 'Design Approved',    order: 3,  isInitial: false, isFinal: false, allowedTransitions: ['Fabrication', 'OnHold', 'Cancelled'],                              color: '#8b5cf6' },
  { status: 'Fabrication',      label: 'Fabrication',        order: 4,  isInitial: false, isFinal: false, allowedTransitions: ['DispatchReady', 'OnHold', 'Cancelled'],                            color: '#f59e0b' },
  { status: 'DispatchReady',    label: 'Dispatch Ready',     order: 5,  isInitial: false, isFinal: false, allowedTransitions: ['Dispatched', 'OnHold'],                                            color: '#f97316' },
  { status: 'Dispatched',       label: 'Dispatched',         order: 6,  isInitial: false, isFinal: false, allowedTransitions: ['Installation', 'Cancelled'],                                       color: '#10b981' },
  { status: 'Installation',     label: 'Installation',       order: 7,  isInitial: false, isFinal: false, allowedTransitions: ['Completed', 'OnHold', 'Cancelled'],                               color: '#14b8a6' },
  { status: 'Completed',        label: 'Completed',          order: 8,  isInitial: false, isFinal: true,  allowedTransitions: [],                                                               color: '#22c55e' },
  { status: 'OnHold',           label: 'On Hold',            order: 9,  isInitial: false, isFinal: false, allowedTransitions: ['DesignInProgress', 'Fabrication', 'Installation', 'Cancelled'],  color: '#f59e0b' },
  { status: 'Cancelled',        label: 'Cancelled',          order: 10, isInitial: false, isFinal: true,  allowedTransitions: [],                                                               color: '#ef4444' },
];

async function main() {
  const orgs = await prisma.organization.findMany({ take: 1 });
  if (!orgs.length) {
    console.error('No organizations found. Register first.');
    process.exit(1);
  }

  const organizationId = orgs[0].id;

  // Clean existing pipelines
  await prisma.statusPipeline.deleteMany({ where: { organizationId } });
  console.log('Cleared existing pipelines');

  const pipelines = [
    ...leadPipeline.map(s => ({ ...s, entityType: 'lead', organizationId })),
    ...customerPipeline.map(s => ({ ...s, entityType: 'customer', organizationId })),
    ...projectPipeline.map(s => ({ ...s, entityType: 'project', organizationId })),
  ];

  await prisma.statusPipeline.createMany({ data: pipelines });
  console.log(`Seeded ${pipelines.length} pipeline steps`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
