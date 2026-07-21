import { PdfEngine } from '../engine/pdf-engine';
import { renderHeader, HeaderData } from '../sections/header.section';
import { renderAddresses, AddressData } from '../sections/address.section';
import { renderItemsTable, ItemsTableData, TableItem } from '../sections/items-table.section';
import { renderSummary, SummaryData } from '../sections/summary.section';
import { renderTerms, TermsData } from '../sections/terms.section';
import { renderFooter, FooterData } from '../sections/footer.section';

export interface PurchaseOrderPdfData {
  poNumber: string;
  poDate: string;
  paymentTerms?: string;
  expectedDelivery?: string;

  buyer: {
    name: string;
    companyName?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };

  supplier: {
    companyName: string;
    contactPerson?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };

  shipTo?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };

  items: {
    itemName: string;
    description?: string;
    hsnCode?: string;
    quantity: number;
    unit: string;
    rate: number;
    discount?: number;
    discountType?: string;
    gstRate?: number;
    gstAmount?: number;
    total: number;
  }[];

  subtotal: number;
  discount?: number;
  discountType?: string;
  tax: number;
  freight?: number;
  packingCharges?: number;
  shippingCharges?: number;
  otherCharges?: number;
  roundOff?: number;
  grandTotal: number;
  currency?: string;

  terms?: string;
  notes?: string;

  company?: {
    name?: string;
    gstin?: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
}

function buildAddressLines(addr: {
  name?: string;
  companyName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}): string[] {
  const lines: string[] = [];
  if (addr.companyName) lines.push(addr.companyName);
  if (addr.name && addr.name !== addr.companyName) lines.push(`Attn: ${addr.name}`);
  if (addr.address) lines.push(addr.address);
  if (addr.city || addr.state || addr.pincode) {
    lines.push([addr.city, addr.state, addr.pincode].filter(Boolean).join(', '));
  }
  if (addr.gstin) lines.push(`GSTIN: ${addr.gstin}`);
  if (addr.phone) lines.push(`Ph: ${addr.phone}`);
  if (addr.email) lines.push(addr.email);
  return lines;
}

export async function generatePurchaseOrderPdf(data: PurchaseOrderPdfData): Promise<import('stream').Readable> {
  const engine = new PdfEngine({
    title: `Purchase Order ${data.poNumber}`,
    author: 'PEB CRM',
    subject: `PO ${data.poNumber}`,
  });

  const headerData: HeaderData = {
    poNumber: data.poNumber,
    poDate: data.poDate,
    paymentTerms: data.paymentTerms,
    expectedDelivery: data.expectedDelivery,
  };

  const addressData: AddressData = {
    buyer: {
      title: 'BUYER',
      lines: buildAddressLines(data.buyer),
    },
    supplier: {
      title: 'SUPPLIER',
      lines: buildAddressLines(data.supplier),
    },
  };

  if (data.shipTo) {
    addressData.shipTo = {
      title: 'SHIP TO',
      lines: buildAddressLines(data.shipTo),
    };
  }

  const tableData: ItemsTableData = {
    items: data.items.map((item, idx) => ({
      sno: idx + 1,
      itemName: item.itemName,
      description: item.description,
      hsnCode: item.hsnCode,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      discount: item.discount,
      discountType: item.discountType,
      gstRate: item.gstRate,
      gstAmount: item.gstAmount,
      total: item.total,
    })),
    currency: data.currency,
  };

  const summaryData: SummaryData = {
    subtotal: data.subtotal,
    discount: data.discount,
    discountType: data.discountType,
    tax: data.tax,
    freight: data.freight,
    packingCharges: data.packingCharges,
    shippingCharges: data.shippingCharges,
    otherCharges: data.otherCharges,
    roundOff: data.roundOff,
    grandTotal: data.grandTotal,
    currency: data.currency,
  };

  const termsData: TermsData = {
    terms: data.terms,
    notes: data.notes,
  };

  renderHeader(engine, headerData);
  renderAddresses(engine, addressData);
  renderItemsTable(engine, tableData);
  renderSummary(engine, summaryData);
  renderTerms(engine, termsData);

  const footerData: FooterData = {
    companyName: data.company?.name,
    gstin: data.company?.gstin,
    phone: data.company?.phone,
    email: data.company?.email,
    website: data.company?.website,
    address: data.company?.address,
  };

  engine.setFooterCallback((_doc, _pageNum, _totalPages) => {
    renderFooter(engine, footerData);
  });

  return engine.finalize();
}
