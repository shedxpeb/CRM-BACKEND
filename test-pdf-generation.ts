import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function testPdfGeneration() {
  try {
    console.log('=== PDF GENERATION TEST ===');
    
    // Fetch quotation directly
    const quotation = await prisma.quotation.findFirst({
      where: { quotationNumber: 'QUO000002', isDeleted: false },
    });

    if (!quotation) {
      console.log('ERROR: Quotation QUO000002 not found');
      return;
    }

    console.log('Quotation found:', quotation.quotationNumber);
    console.log('Inquiry Number:', quotation.inquiryNumber);
    console.log('Customer Name:', quotation.customerName);  
    console.log('Organization ID:', quotation.organizationId);

    // Fetch organization
    const organization = await prisma.organization.findFirst({
      where: { id: quotation.organizationId, isDeleted: false },
    });

    if (!organization) {
      console.log('ERROR: Organization not found');
      return;
    }

    console.log('Organization Name:', organization.name);
    console.log('Technical Specifications:', JSON.stringify(quotation.technicalSpecifications, null, 2));

    // Write debug info to file
    const debugInfo = {
      quotation: {
        id: quotation.id,
        quotationNumber: quotation.quotationNumber,
        inquiryNumber: quotation.inquiryNumber,
        date: quotation.date,
        customerName: quotation.customerName,
        customerAddress: quotation.customerAddress,
        customerGST: quotation.customerGST,
      },
      organization: {
        name: organization.name,
        address: organization.address,
        city: organization.city,
        state: organization.state,
        gstNumber: organization.gstNumber,
      },
      technicalSpecifications: quotation.technicalSpecifications,
      scopeConfiguration: quotation.scopeConfiguration,
      materialSelections: quotation.materialSelections,
      pricingConfiguration: quotation.pricingConfiguration,
    };

    fs.writeFileSync(
      'c:\\Users\\Admin\\Desktop\\s\\PEB-CRM\\ADMIN-CRM\\backend\\quotation-debug.json',
      JSON.stringify(debugInfo, null, 2)
    );

    console.log('Debug info saved to quotation-debug.json');
    console.log('=== TEST COMPLETE ===');
    console.log('To generate PDF, use the browser preview at:');
    console.log('http://localhost:3000/dashboard/documents/20f5aa03-caf8-489d-9f74-4b0bac478b81');

  } catch (error) {
    console.error('ERROR:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testPdfGeneration();
