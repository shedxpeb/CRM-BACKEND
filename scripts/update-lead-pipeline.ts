/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateLeadPipeline() {
  console.log('Updating lead pipeline to allow Rejected → New and Converted → New transitions...');

  // Get all organizations
  const organizations = await prisma.organization.findMany({
    select: { id: true },
  });

  for (const org of organizations) {
    console.log(`Processing organization: ${org.id}`);

    // Delete existing lead pipeline
    await prisma.statusPipeline.deleteMany({
      where: {
        entityType: 'lead',
        organizationId: org.id,
      },
    });

    // Create new pipeline with Rejected/Converted → New transitions
    await prisma.statusPipeline.createMany({
      data: [
        {
          organizationId: org.id,
          entityType: 'lead',
          status: 'New',
          label: 'New',
          order: 1,
          color: '#6366f1',
          isInitial: true,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['Contacted'],
        },
        {
          organizationId: org.id,
          entityType: 'lead',
          status: 'Contacted',
          label: 'Contacted',
          order: 2,
          color: '#3b82f6',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['DesignPending', 'Rejected'],
        },
        {
          organizationId: org.id,
          entityType: 'lead',
          status: 'DesignPending',
          label: 'Design Pending',
          order: 3,
          color: '#8b5cf6',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['BOQPending', 'Rejected'],
        },
        {
          organizationId: org.id,
          entityType: 'lead',
          status: 'BOQPending',
          label: 'BOQ Pending',
          order: 4,
          color: '#f59e0b',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['EstimateSent', 'Rejected'],
        },
        {
          organizationId: org.id,
          entityType: 'lead',
          status: 'EstimateSent',
          label: 'Estimate Sent',
          order: 5,
          color: '#f97316',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['ProposalSent', 'Rejected'],
        },
        {
          organizationId: org.id,
          entityType: 'lead',
          status: 'ProposalSent',
          label: 'Proposal Sent',
          order: 6,
          color: '#06b6d4',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['Negotiation', 'Approved', 'Rejected'],
        },
        {
          organizationId: org.id,
          entityType: 'lead',
          status: 'Negotiation',
          label: 'Negotiation',
          order: 7,
          color: '#f97316',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['Approved', 'Rejected'],
        },
        {
          organizationId: org.id,
          entityType: 'lead',
          status: 'Approved',
          label: 'Approved',
          order: 8,
          color: '#22c55e',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['Converted', 'Rejected'],
        },
        {
          organizationId: org.id,
          entityType: 'lead',
          status: 'Rejected',
          label: 'Rejected',
          order: 9,
          color: '#ef4444',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['New'],
        },
        {
          organizationId: org.id,
          entityType: 'lead',
          status: 'Converted',
          label: 'Converted',
          order: 10,
          color: '#14b8a6',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['New'],
        },
      ],
    });

    console.log(`Updated pipeline for organization: ${org.id}`);
  }

  console.log('Lead pipeline update completed successfully!');
}

updateLeadPipeline()
  .catch((e) => {
    console.error('Error updating lead pipeline:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
