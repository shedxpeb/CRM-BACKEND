import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillPurchaseOrders() {
  console.log('Starting backfill of Purchase Orders...');

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: {
      vendor: true,
      organization: true,
    },
  });

  console.log(`Found ${purchaseOrders.length} Purchase Orders to backfill`);

  for (const po of purchaseOrders) {
    // Backfill Ship To from Organization (company address)
    const org = po.organization;
    const shipToData: any = {
      shipToCompanyName: org?.name || null,
      shipToAddress: org?.address || null,
      shipToCity: org?.city || null,
      shipToState: org?.state || null,
      shipToPincode: org?.pincode || null,
      shipToCountry: org?.country || 'India',
      shipToPhone: org?.mobile || null,
      shipToEmail: org?.email || null,
      shipToGstNumber: org?.gstNumber || null,
    };

    // Backfill Supplier from Vendor
    const vendor = po.vendor;
    const supplierData: any = {
      supplierCompanyName: vendor?.companyName || null,
      supplierName: vendor?.contactPerson || null,
      supplierAddress: vendor?.address || null,
      supplierCity: vendor?.city || null,
      supplierState: vendor?.state || null,
      supplierPincode: vendor?.pincode || null,
      supplierCountry: vendor?.country || 'India',
      supplierPhone: vendor?.phone || null,
      supplierEmail: vendor?.email || null,
      supplierGstNumber: vendor?.gstNumber || null,
    };

    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        ...shipToData,
        ...supplierData,
      },
    });

    console.log(`Backfilled PO: ${po.poNumber}`);
  }

  console.log('Backfill completed successfully');
}

backfillPurchaseOrders()
  .catch((e) => {
    console.error('Error during backfill:', e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
