import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEditQuotation() {
  try {
    console.log('=== STARTING EDIT TEST FOR QUO000005 ===\n');

    // Step 1: Fetch current quotation
    const quotation = await prisma.quotation.findFirst({
      where: { quotationNumber: 'QUO000005' },
    });

    if (!quotation) {
      console.log('ERROR: Quotation QUO000005 not found');
      return;
    }

    console.log('Step 1: Current quotation fetched');
    console.log('ID:', quotation.id);
    console.log('Quotation Number:', quotation.quotationNumber);
    console.log('');

    // Step 2: Modify with unique test values
    const techSpecs = quotation.technicalSpecifications as any;
    const scopeConfig = quotation.scopeConfiguration as any;

    console.log('Step 2: Applying unique test values...');

    // Modify building specification
    if (scopeConfig) {
      scopeConfig.frameType = 'TEST-BUILDING-001';
      scopeConfig.futureExpansion = 'TEST-EXPANSION-001';
    }

    // Modify technical specifications - roof accessories
    if (techSpecs?.roofAccessories && techSpecs.roofAccessories.length > 2) {
      // Modify Row 3 (Skylight)
      techSpecs.roofAccessories[2].description = 'TEST-SKYLIGHT-DESCRIPTION-EDITED';
      techSpecs.roofAccessories[2].size = 'TEST-SIZE-800 MM';
      techSpecs.roofAccessories[2].quantity = 'TEST-QUANTITY-99 SQM';
      techSpecs.roofAccessories[2].location = 'TEST-LOCATION-EDITED';
    }

    // Modify contract price rows
    if (techSpecs?.contractPriceRows && techSpecs.contractPriceRows.length > 0) {
      techSpecs.contractPriceRows[0].rate = '987654.32';
      techSpecs.contractPriceRows[0].amount = 987654320;
    }

    // Modify design load
    if (techSpecs) {
      techSpecs.deadLoad = 'TEST-DEAD-LOAD-001';
      techSpecs.liveLoad = 'TEST-LIVE-LOAD-001';
    }

    // Modify crane detail
    if (techSpecs) {
      techSpecs.craneCapacity = 'TEST-CRANE-001';
    }

    console.log('Test values applied:');
    console.log('- Building Spec frameType: TEST-BUILDING-001');
    console.log('- Skylight description: TEST-SKYLIGHT-DESCRIPTION-EDITED');
    console.log('- Skylight size: TEST-SIZE-800 MM');
    console.log('- Skylight quantity: TEST-QUANTITY-99 SQM');
    console.log('- Skylight location: TEST-LOCATION-EDITED');
    console.log('- Contract Price Row 1 rate: 987654.32');
    console.log('- Contract Price Row 1 amount: 987654320');
    console.log('- Design Load deadLoad: TEST-DEAD-LOAD-001');
    console.log('- Design Load liveLoad: TEST-LIVE-LOAD-001');
    console.log('- Crane Capacity: TEST-CRANE-001');
    console.log('');

    // Step 3: Save changes
    console.log('Step 3: Saving changes to database...');
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        scopeConfiguration: scopeConfig,
        technicalSpecifications: techSpecs,
      },
    });
    console.log('✓ Changes saved successfully');
    console.log('');

    // Step 4: Verify persistence
    console.log('Step 4: Verifying database persistence...');
    const updatedQuotation = await prisma.quotation.findFirst({
      where: { quotationNumber: 'QUO000005' },
    });

    if (!updatedQuotation) {
      console.log('ERROR: Updated quotation not found');
      return;
    }

    const updatedTechSpecs = updatedQuotation.technicalSpecifications as any;
    const updatedScopeConfig = updatedQuotation.scopeConfiguration as any;

    console.log('Verification Results:');
    console.log('Building Spec frameType:', updatedScopeConfig?.frameType);
    console.log('Skylight description:', updatedTechSpecs?.roofAccessories?.[2]?.description);
    console.log('Skylight size:', updatedTechSpecs?.roofAccessories?.[2]?.size);
    console.log('Skylight quantity:', updatedTechSpecs?.roofAccessories?.[2]?.quantity);
    console.log('Skylight location:', updatedTechSpecs?.roofAccessories?.[2]?.location);
    console.log('Contract Price Row 1 rate:', updatedTechSpecs?.contractPriceRows?.[0]?.rate);
    console.log('Contract Price Row 1 amount:', updatedTechSpecs?.contractPriceRows?.[0]?.amount);
    console.log('Design Load deadLoad:', updatedTechSpecs?.deadLoad);
    console.log('Design Load liveLoad:', updatedTechSpecs?.liveLoad);
    console.log('Crane Capacity:', updatedTechSpecs?.craneCapacity);
    console.log('');

    // Verify all test values persisted
    const allPersisted =
      updatedScopeConfig?.frameType === 'TEST-BUILDING-001' &&
      updatedTechSpecs?.roofAccessories?.[2]?.description === 'TEST-SKYLIGHT-DESCRIPTION-EDITED' &&
      updatedTechSpecs?.roofAccessories?.[2]?.size === 'TEST-SIZE-800 MM' &&
      updatedTechSpecs?.roofAccessories?.[2]?.quantity === 'TEST-QUANTITY-99 SQM' &&
      updatedTechSpecs?.roofAccessories?.[2]?.location === 'TEST-LOCATION-EDITED' &&
      updatedTechSpecs?.contractPriceRows?.[0]?.rate === '987654.32' &&
      updatedTechSpecs?.contractPriceRows?.[0]?.amount === 987654320 &&
      updatedTechSpecs?.deadLoad === 'TEST-DEAD-LOAD-001' &&
      updatedTechSpecs?.liveLoad === 'TEST-LIVE-LOAD-001' &&
      updatedTechSpecs?.craneCapacity === 'TEST-CRANE-001';

    if (allPersisted) {
      console.log('✓ ALL TEST VALUES PERSISTED SUCCESSFULLY');
    } else {
      console.log('✗ SOME TEST VALUES DID NOT PERSIST');
    }

    console.log('');
    console.log('=== EDIT TEST COMPLETED ===');
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEditQuotation();
