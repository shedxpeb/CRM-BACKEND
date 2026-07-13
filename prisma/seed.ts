import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const cities = ['Ahmedabad', 'Surat', 'Rajkot', 'Vadodara', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar'];
const companies = [
  'Tata Steel', 'Reliance Industries', 'Adani Group', 'Larsen & Toubro', 'Mahindra & Mahindra',
  'Godrej & Boyce', 'Kirloskar Group', 'ThyssenKrupp', 'Jindal Steel', 'Essar Steel',
  'JSW Steel', 'Tata Motors', 'Maruti Suzuki', 'Hyundai Motors', 'Honda Cars',
  'Toyota Kirloskar', 'Ford India', 'Volkswagen India', 'Skoda Auto', 'Audi India',
  'Mercedes-Benz', 'BMW India', 'Porsche India', 'Ferrari India', 'Lamborghini India',
  'Rolls-Royce', 'Bentley Motors', 'Aston Martin', 'McLaren Automotive', 'Bugatti Automobiles',
  'Koenigsegg', 'Pagani Automobili', 'Rimac Automobili', 'Pininfarina', 'Italdesign',
  'Bertone', 'Zagato', 'Giorgetto Giugiaro', 'Marcello Gandini', 'Nuccio Bertone'
];

const projectTitles = [
  'Industrial Warehouse', 'Manufacturing Plant', 'Distribution Center', 'Factory Building',
  'Commercial Office', 'Retail Store', 'Shopping Mall', 'Showroom',
  'Residential Complex', 'Apartment Building', 'Villa Project', 'Township',
  'Institutional Building', 'School Building', 'Hospital Complex', 'Research Center'
];

const firstNames = ['Rajesh', 'Amit', 'Vikram', 'Suresh', 'Rahul', 'Arun', 'Deepak', 'Sanjay', 'Vijay', 'Anil'];
const lastNames = ['Patel', 'Shah', 'Mehta', 'Jain', 'Agarwal', 'Singh', 'Kumar', 'Gupta', 'Sharma', 'Verma'];

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateMobile(): string {
  const prefix = ['98', '99', '97', '94', '91', '93', '92', '89'][Math.floor(Math.random() * 8)];
  const middle = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${prefix}${middle}`;
}

function generateEmail(name: string, company: string): string {
  const cleanName = name.toLowerCase().replace(/\s/g, '.');
  const cleanCompany = company.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9]/g, '');
  return `${cleanName}@${cleanCompany}.com`;
}

async function main() {
  // Get count from command line argument or default to 50
  const countArg = process.argv[2];
  const count = countArg ? parseInt(countArg, 10) : 50;

  // Validate count
  const validCounts = [50, 100, 500, 1000, 5000];
  if (!validCounts.includes(count)) {
    console.error(`Invalid count: ${count}. Valid options: ${validCounts.join(', ')}`);
    console.log('Usage: npm run seed [count]');
    console.log('Example: npm run seed 100');
    process.exit(1);
  }

  console.log(`Starting seed with ${count} records...`);

  const seedUser = await prisma.user.findFirst({
    where: { organizationId: { not: null } },
    orderBy: { createdAt: 'asc' },
  });

  if (!seedUser?.organizationId) {
    console.error('No organization user found. Register an account first, then run seed.');
    process.exit(1);
  }

  const organizationId = seedUser.organizationId;
  const createdById = seedUser.id;

  // Delete existing leads for this organization
  await prisma.lead.deleteMany({ where: { organizationId } });
  console.log('Deleted existing leads');

  const statuses = ['New', 'Contacted', 'DesignPending', 'BOQPending', 'EstimateSent', 'ProposalSent', 'Negotiation', 'Approved', 'Rejected', 'Converted'];
  const priorities = ['Low', 'Medium', 'High', 'Urgent'];
  const sources = ['Website', 'Referral', 'ColdCall', 'Email', 'SocialMedia', 'TradeShow', 'Advertisement', 'Other'];
  const projectTypes = ['Factory', 'Warehouse', 'IndustrialShed', 'Commercial', 'Residential', 'Other'];
  const structureTypes = ['PEB', 'SteelStructure', 'Hybrid', 'Other'];

  const leads: any[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const customerName = `${firstName} ${lastName}`;
    const companyName = randomItem(companies);
    const city = randomItem(cities);
    const projectTitle = randomItem(projectTitles);

    const createdAt = randomDate(new Date('2024-01-01'), new Date('2024-12-31'));
    const lastFollowUp = randomDate(createdAt, new Date('2024-12-31'));
    const nextFollowUpDate = randomDate(new Date(), new Date('2025-06-30'));

    const status = randomItem(statuses);
    const isConverted = status === 'Converted' || (status === 'Approved' && Math.random() > 0.5);

    const lead = {
      customerName,
      companyName,
      mobile: generateMobile(),
      email: generateEmail(customerName, companyName),
      city,
      projectTitle,
      projectType: randomItem(projectTypes),
      structureType: randomItem(structureTypes),
      source: randomItem(sources),
      priority: randomItem(priorities),
      status,
      organizationId,
      createdById,
      assignedToId: Math.random() > 0.3 ? createdById : null,
      remarks: Math.random() > 0.5 ? 'Initial inquiry received. Follow-up scheduled.' : null,
      isConverted,
      createdAt,
      updatedAt: randomDate(createdAt, new Date('2024-12-31')),
      lastFollowUp: Math.random() > 0.3 ? lastFollowUp : null,
      nextFollowUpDate: Math.random() > 0.4 ? nextFollowUpDate : null,
    };

    leads.push(lead);
  }

  // Insert leads in batches
  await prisma.lead.createMany({
    data: leads,
  });

  console.log(`Seeded ${leads.length} leads`);

  // Print summary
  const total = await prisma.lead.count();
  const byStatus = await prisma.lead.groupBy({
    by: ['status'],
    _count: true,
  });
  const byPriority = await prisma.lead.groupBy({
    by: ['priority'],
    _count: true,
  });
  const byCity = await prisma.lead.groupBy({
    by: ['city'],
    _count: true,
  });

  console.log('\n=== Seed Summary ===');
  console.log(`Total leads: ${total}`);
  console.log('\nBy Status:');
  byStatus.forEach(item => {
    console.log(`  ${item.status}: ${item._count}`);
  });
  console.log('\nBy Priority:');
  byPriority.forEach(item => {
    console.log(`  ${item.priority}: ${item._count}`);
  });
  console.log('\nBy City:');
  byCity.forEach(item => {
    console.log(`  ${item.city}: ${item._count}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
