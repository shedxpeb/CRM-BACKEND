/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateProjectPipeline() {
  console.log('Updating project pipeline to allow Cancelled → New transition...');

  // Get all organizations
  const organizations = await prisma.organization.findMany({
    select: { id: true },
  });

  for (const org of organizations) {
    console.log(`Processing organization: ${org.id}`);

    // Delete existing project pipeline
    await prisma.statusPipeline.deleteMany({
      where: {
        entityType: 'project',
        organizationId: org.id,
      },
    });

    // Create new pipeline with Cancelled → New transition
    await prisma.statusPipeline.createMany({
      data: [
        {
          organizationId: org.id,
          entityType: 'project',
          status: 'New',
          label: 'New',
          order: 1,
          color: '#6b7280',
          isInitial: true,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['DesignInProgress', 'OnHold', 'Cancelled'],
        },
        {
          organizationId: org.id,
          entityType: 'project',
          status: 'DesignInProgress',
          label: 'Design In Progress',
          order: 2,
          color: '#3b82f6',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['DesignApproved', 'OnHold', 'Cancelled'],
        },
        {
          organizationId: org.id,
          entityType: 'project',
          status: 'DesignApproved',
          label: 'Design Approved',
          order: 3,
          color: '#8b5cf6',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['Fabrication', 'OnHold', 'Cancelled'],
        },
        {
          organizationId: org.id,
          entityType: 'project',
          status: 'Fabrication',
          label: 'Fabrication',
          order: 4,
          color: '#f59e0b',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['DispatchReady', 'OnHold', 'Cancelled'],
        },
        {
          organizationId: org.id,
          entityType: 'project',
          status: 'DispatchReady',
          label: 'Dispatch Ready',
          order: 5,
          color: '#f97316',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['Dispatched', 'OnHold'],
        },
        {
          organizationId: org.id,
          entityType: 'project',
          status: 'Dispatched',
          label: 'Dispatched',
          order: 6,
          color: '#10b981',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['Installation', 'Cancelled'],
        },
        {
          organizationId: org.id,
          entityType: 'project',
          status: 'Installation',
          label: 'Installation',
          order: 7,
          color: '#14b8a6',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['Completed', 'OnHold', 'Cancelled'],
        },
        {
          organizationId: org.id,
          entityType: 'project',
          status: 'Completed',
          label: 'Completed',
          order: 8,
          color: '#22c55e',
          isInitial: false,
          isFinal: true,
          isActive: true,
          allowedTransitions: [],
        },
        {
          organizationId: org.id,
          entityType: 'project',
          status: 'OnHold',
          label: 'On Hold',
          order: 9,
          color: '#f59e0b',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['DesignInProgress', 'Fabrication', 'Installation', 'Cancelled'],
        },
        {
          organizationId: org.id,
          entityType: 'project',
          status: 'Cancelled',
          label: 'Cancelled',
          order: 10,
          color: '#ef4444',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['New'],
        },
      ],
    });

    console.log(`Updated pipeline for organization: ${org.id}`);
  }

  console.log('Project pipeline update completed successfully!');
}

updateProjectPipeline()
  .catch((e) => {
    console.error('Error updating project pipeline:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
