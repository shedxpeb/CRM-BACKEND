import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSkylightRow() {
  try {
    const quotation = await prisma.quotation.findFirst({
      where: { quotationNumber: 'QUO000005', isDeleted: false },
    });

    if (!quotation) {
      console.log('Quotation QUO000005 not found');
      return;
    }

    const techSpecs = quotation.technicalSpecifications as any;
    const roofAccessories = techSpecs?.roofAccessories || [];

    console.log('=== BEFORE FIX ===');
    console.log('Row 3 (Skylight):');
    console.log('Description:', roofAccessories[2]?.description);
    console.log('Size:', roofAccessories[2]?.size);
    console.log('Quantity:', roofAccessories[2]?.quantity);
    console.log('Location:', roofAccessories[2]?.location);

    // Fix Row 3 (index 2) - Skylight
    if (roofAccessories[2] && roofAccessories[2].description === 'Skylight') {
      roofAccessories[2].description = 'Skylight : Single skin translucent, Frp thick-3mm, UV Approved, Protected, Profiled with Safety Mesh';
      roofAccessories[2].size = '600 MM';
    }

    // Update the quotation
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        technicalSpecifications: techSpecs,
      },
    });

    console.log('');
    console.log('=== AFTER FIX ===');
    console.log('Row 3 (Skylight):');
    console.log('Description:', roofAccessories[2]?.description);
    console.log('Size:', roofAccessories[2]?.size);
    console.log('Quantity:', roofAccessories[2]?.quantity);
    console.log('Location:', roofAccessories[2]?.location);
    console.log('');
    console.log('✓ QUO000005 Row 3 Skylight data structure fixed in database');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSkylightRow();
