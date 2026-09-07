import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectQuotation() {
  try {
    const quotation = await prisma.quotation.findFirst({
      where: { quotationNumber: 'QUO000005', isDeleted: false },
    });

    if (!quotation) {
      console.log('Quotation QUO000005 not found');
      return;
    }

    console.log('=== QUOTATION QUO000005 DATA ===');
    console.log('ID:', quotation.id);
    console.log('Quotation Number:', quotation.quotationNumber);
    console.log('');
    console.log('=== ROOF ACCESSORIES (from technicalSpecifications) ===');
    const techSpecs = quotation.technicalSpecifications as any;
    const roofAccessories = techSpecs?.roofAccessories || [];
    console.log('Roof Accessories count:', roofAccessories.length);
    console.log('');
    roofAccessories.forEach((row: any, index: number) => {
      console.log(`--- Row ${index + 1} ---`);
      console.log('Description:', row.description);
      console.log('Size:', row.size);
      console.log('Quantity:', row.quantity);
      console.log('Location:', row.location);
      console.log('');
    });
    console.log('=== FULL TECHNICAL SPECIFICATIONS (JSON) ===');
    console.log(JSON.stringify(quotation.technicalSpecifications, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectQuotation();
