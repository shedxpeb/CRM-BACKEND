import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { generatePurchaseOrderPdf, PurchaseOrderPdfData } from '../src/pdf/templates/purchase-order.template';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const pool = new Pool({ connectionString: url, max: 3 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const id = 'a6f6806e-0fda-476c-a71c-db240af72d85';
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, isDeleted: false },
    include: { items: true, vendor: true },
  });
  if (!po) throw new Error('PO not found');

  const buyer = await prisma.organization.findFirst({ where: { id: po.organizationId } });
  const warehouse = po.warehouseId
    ? await prisma.warehouse.findUnique({ where: { id: po.warehouseId } })
    : null;

  const pdfData: PurchaseOrderPdfData = {
    poNumber: po.poNumber,
    poDate: po.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    paymentTerms: po.paymentTerms || undefined,
    expectedDelivery: po.expectedDeliveryDate
      ? po.expectedDeliveryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : undefined,

    buyer: {
      name: buyer?.name || '',
      companyName: buyer?.name || '',
      address: buyer?.address || undefined,
      city: buyer?.city || undefined,
      state: buyer?.state || undefined,
      pincode: buyer?.pincode || undefined,
      phone: buyer?.mobile || undefined,
      email: buyer?.email || undefined,
      gstin: buyer?.gstNumber || undefined,
    },

    supplier: {
      companyName: po.vendor?.companyName || po.vendorName,
      contactPerson: po.vendor?.contactPerson || undefined,
      address: po.vendor?.address || undefined,
      city: po.vendor?.city || undefined,
      state: po.vendor?.state || undefined,
      pincode: po.vendor?.pincode || undefined,
      phone: po.vendor?.phone || undefined,
      email: po.vendor?.email || undefined,
      gstin: po.vendor?.gstNumber || undefined,
    },

    shipTo: warehouse
      ? {
          name: warehouse.name,
          address: warehouse.address || warehouse.location || undefined,
          city: undefined,
          state: undefined,
          pincode: undefined,
        }
      : undefined,

    items: po.items.map((item) => ({
      itemName: item.itemName,
      description: item.description || undefined,
      hsnCode: item.hsnCode || undefined,
      quantity: Number(item.quantity),
      unit: item.unit,
      rate: Number(item.rate),
      discount: item.discount ? Number(item.discount) : undefined,
      discountType: item.discountType || undefined,
      gstRate: item.gstRate ? Number(item.gstRate) : undefined,
      gstAmount: item.gstAmount ? Number(item.gstAmount) : undefined,
      total: Number(item.total),
    })),

    subtotal: Number(po.subtotal),
    discount: po.discount ? Number(po.discount) : undefined,
    discountType: po.discountType || undefined,
    tax: Number(po.tax),
    freight: po.freight ? Number(po.freight) : undefined,
    packingCharges: po.packingCharges ? Number(po.packingCharges) : undefined,
    shippingCharges: po.shippingCharges ? Number(po.shippingCharges) : undefined,
    otherCharges: po.otherCharges ? Number(po.otherCharges) : undefined,
    roundOff: po.roundOff ? Number(po.roundOff) : undefined,
    grandTotal: Number(po.grandTotal),
    currency: po.currency || 'INR',

    notes: po.notes || undefined,
    terms: po.terms || undefined,

    company: {
      name: buyer?.name || 'PEB Systems',
      gstin: buyer?.gstNumber || undefined,
      phone: buyer?.mobile || undefined,
      email: buyer?.email || undefined,
      website: buyer?.website || undefined,
    },
  };

  const stream = await generatePurchaseOrderPdf(pdfData);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const buf = Buffer.concat(chunks);

  const out = path.join(process.cwd(), 'scripts', `po-${po.poNumber}.pdf`);
  fs.writeFileSync(out, buf);
  console.log(`WROTE ${out} (${buf.length} bytes)`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
