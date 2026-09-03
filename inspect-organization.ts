import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectOrganization() {
  try {
    const org = await prisma.organization.findFirst({
      where: { id: '2ce16ab2-91bc-492a-b6db-4da3067a7eb5', isDeleted: false },
      select: {
        name: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        mobile: true,
        email: true,
        gstNumber: true,
        website: true,
        settings: true,
      },
    });

    if (!org) {
      console.log('Organization not found');
      return;
    }

    console.log('=== ORGANIZATION DATA ===');
    console.log('Name:', org.name);
    console.log('Address:', org.address);
    console.log('City:', org.city);
    console.log('State:', org.state);
    console.log('Pincode:', org.pincode);
    console.log('Mobile:', org.mobile);
    console.log('Email:', org.email);
    console.log('GSTIN:', org.gstNumber);
    console.log('Website:', org.website);
    console.log('');
    console.log('=== SETTINGS (JSON) ===');
    console.log(JSON.stringify(org.settings, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectOrganization();
