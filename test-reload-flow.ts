import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testReloadFlow() {
  try {
    console.log('=== TESTING RELOAD/EDIT RESTORE FLOW ===\n');

    // Step 1: Fetch quotation as if from GET endpoint
    const quotation = await prisma.quotation.findFirst({
      where: { quotationNumber: 'QUO000005' },
    });

    if (!quotation) {
      console.log('ERROR: Quotation QUO000005 not found');
      return;
    }

    console.log('Step 1: Simulating GET /quotations/:id response');
    console.log('Quotation ID:', quotation.id);
    console.log('Quotation Number:', quotation.quotationNumber);
    console.log('');

    // Step 2: Simulate PDF service fetchQuotation behavior (flattening)
    const techSpecs = quotation.technicalSpecifications as any;
    const scopeConfig = quotation.scopeConfiguration as any;

    console.log('Step 2: Simulating PDF service flattening (as in fetchQuotation)');
    console.log('This is what frontend receives after PDF service flattening:');
    console.log('');

    // Simulate the flattening that happens in fetchQuotation
    const flattenedResponse = {
      ...quotation,
      ...techSpecs, // This is what PDF service does
    };

    console.log('Step 3: Simulating frontend QuotationBuilder initialization');
    console.log('This is what QuotationBuilder would receive as quotation prop:');
    console.log('');

    // Check what the frontend would read
    console.log('Frontend expects: quotation.technicalSpecifications.roofAccessories');
    console.log('Actual data structure after flattening:');
    console.log('- roofAccessories available at top level?', typeof flattenedResponse.roofAccessories !== 'undefined');
    console.log('- roofAccessories count:', Array.isArray(flattenedResponse.roofAccessories) ? flattenedResponse.roofAccessories.length : 0);
    console.log('');

    console.log('Frontend expects: quotation.buildingSpec');
    console.log('Actual data structure:');
    console.log('- buildingSpec available at top level?', typeof flattenedResponse.buildingSpec !== 'undefined');
    console.log('- buildingSpec from scopeConfig:', scopeConfig ? 'Available' : 'Not available');
    console.log('');

    // Simulate the frontend initialization logic
    console.log('Step 4: Simulating frontend QuotationBuilder useState initialization');
    console.log('');

    // This is what the frontend does:
    const techSpecsFromQuotation = (flattenedResponse as any)?.technicalSpecifications;
    const savedRoofAccessories = techSpecsFromQuotation?.roofAccessories;

    console.log('Frontend initialization logic:');
    console.log('- const techSpecs = (quotation as any)?.technicalSpecifications');
    console.log('- const savedRoofAccessories = techSpecs?.roofAccessories');
    console.log('');

    console.log('Results:');
    console.log('- techSpecs exists?', typeof techSpecsFromQuotation !== 'undefined');
    console.log('- savedRoofAccessories exists?', typeof savedRoofAccessories !== 'undefined');
    console.log('- savedRoofAccessories is array?', Array.isArray(savedRoofAccessories));
    console.log('- savedRoofAccessories length:', Array.isArray(savedRoofAccessories) ? savedRoofAccessories.length : 0);
    console.log('');

    // Check if test values are accessible
    if (savedRoofAccessories && savedRoofAccessories.length > 2) {
      console.log('Step 5: Checking if test values are accessible to frontend');
      console.log('- Skylight description:', savedRoofAccessories[2]?.description);
      console.log('- Skylight size:', savedRoofAccessories[2]?.size);
      console.log('- Skylight quantity:', savedRoofAccessories[2]?.quantity);
      console.log('- Skylight location:', savedRoofAccessories[2]?.location);
      console.log('');

      const testValuesPresent =
        savedRoofAccessories[2]?.description === 'TEST-SKYLIGHT-DESCRIPTION-EDITED' &&
        savedRoofAccessories[2]?.size === 'TEST-SIZE-800 MM' &&
        savedRoofAccessories[2]?.quantity === 'TEST-QUANTITY-99 SQM' &&
        savedRoofAccessories[2]?.location === 'TEST-LOCATION-EDITED';

      if (testValuesPresent) {
        console.log('✓ TEST VALUES ARE ACCESSIBLE TO FRONTEND');
      } else {
        console.log('✗ TEST VALUES ARE NOT ACCESSIBLE TO FRONTEND');
      }
    } else {
      console.log('✗ savedRoofAccessories not available or empty');
    }

    console.log('');
    console.log('=== RELOAD/EDIT RESTORE TEST COMPLETED ===');
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testReloadFlow();
