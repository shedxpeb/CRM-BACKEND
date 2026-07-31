/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateCustomerPipeline() {
  console.log('Updating customer pipeline to include Rejected status...');

  // Get all organizations
  const organizations = await prisma.organization.findMany({
    select: { id: true },
  });

  for (const org of organizations) {
    console.log(`Processing organization: ${org.id}`);

    // Delete existing customer pipeline
    await prisma.statusPipeline.deleteMany({
      where: {
        entityType: 'customer',
        organizationId: org.id,
      },
    });

    // Create new pipeline with Rejected
    await prisma.statusPipeline.createMany({
      data: [
        {
          organizationId: org.id,
          entityType: 'customer',
          status: 'Active',
          label: 'Active',
          order: 1,
          color: '#22c55e',
          isInitial: true,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['Inactive', 'Archived', 'Rejected'],
        },
        {
          organizationId: org.id,
          entityType: 'customer',
          status: 'Inactive',
          label: 'Inactive',
          order: 2,
          color: '#f59e0b',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['Active', 'Archived', 'Rejected'],
        },
        {
          organizationId: org.id,
          entityType: 'customer',
          status: 'Archived',
          label: 'Archived',
          order: 3,
          color: '#6b7280',
          isInitial: false,
          isFinal: true,
          isActive: true,
          allowedTransitions: [],
        },
        {
          organizationId: org.id,
          entityType: 'customer',
          status: 'Rejected',
          label: 'Rejected',
          order: 4,
          color: '#ef4444',
          isInitial: false,
          isFinal: false,
          isActive: true,
          allowedTransitions: ['Active'],
        },
      ],
    });

    console.log(`Updated pipeline for organization: ${org.id}`);
  }

  console.log('Customer pipeline update completed successfully!');
}

updateCustomerPipeline()
  .catch((e) => {
    console.error('Error updating customer pipeline:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
