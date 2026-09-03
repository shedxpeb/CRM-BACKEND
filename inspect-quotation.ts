import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectQuotation() {
  try {
    const quotation = await prisma.quotation.findFirst({
      where: { quotationNumber: 'QUO000002', isDeleted: false },
    });

    if (!quotation) {
      console.log('Quotation QUO000002 not found');
      return;
    }

    console.log('=== QUOTATION QUO000002 DATA ===');
    console.log('ID:', quotation.id);
    console.log('Quotation Number:', quotation.quotationNumber);
    console.log('Inquiry Number:', quotation.inquiryNumber);
    console.log('Date:', quotation.date);
    console.log('Created At:', quotation.createdAt);
    console.log('Customer Name:', quotation.customerName);
    console.log('Customer Address:', quotation.customerAddress);
    console.log('Customer City:', quotation.customerCity);
    console.log('Customer State:', quotation.customerState);
    console.log('Customer Pincode:', quotation.customerPincode);
    console.log('Customer GST:', quotation.customerGST);
    console.log('Customer ID:', quotation.customerId);
    console.log('Organization ID:', quotation.organizationId);
    console.log('');
    console.log('=== TECHNICAL SPECIFICATIONS (JSON) ===');
    console.log(JSON.stringify(quotation.technicalSpecifications, null, 2));
    console.log('');
    console.log('=== SCOPE CONFIGURATION (JSON) ===');
    console.log(JSON.stringify(quotation.scopeConfiguration, null, 2));
    console.log('');
    console.log('=== MATERIAL SELECTIONS (JSON) ===');
    console.log(JSON.stringify(quotation.materialSelections, null, 2));
    console.log('');
    console.log('=== PRICING CONFIGURATION (JSON) ===');
    console.log(JSON.stringify(quotation.pricingConfiguration, null, 2));
    console.log('');
    console.log('=== CALCULATED AMOUNTS ===');
    console.log('Subtotal:', quotation.subtotal);
    console.log('GST Amount:', quotation.taxAmount);
    console.log('Grand Total:', quotation.grandTotal);
    console.log('Amount in Words:', quotation.amountInWords);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectQuotation();
