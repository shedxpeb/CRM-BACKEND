import { PdfEngine } from '../engine/pdf-engine';
import { LayoutCalculator } from '../layout/layout-engine';
import { SectionRenderer } from '../layout/section-renderer';

export interface PurchaseOrderPdfData {
  poNumber: string;
  poDate: string;
  revision?: number;
  status?: string;
  paymentTerms?: string;
  expectedDelivery?: string;
  projectName?: string;
  warehouseName?: string;

  company: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    email?: string;
    website?: string;
    gstin?: string;
  };

  buyer: {
    company?: string;
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };

  supplier: {
    company: string;
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };

  items: {
    name: string;
    description?: string;
    hsn?: string;
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
  cgst: number;
  sgst: number;
  igst: number;
  packing?: number;
  freight?: number;
  transport?: number;
  other?: number;
  roundOff?: number;
  grandTotal: number;
  currency?: string;

  terms?: string;
}

const GAP = 6;

export async function generatePurchaseOrderPdf(
  data: PurchaseOrderPdfData,
): Promise<import('stream').Readable> {
  console.log('NEW PDF TEMPLATE - Generating PO:', data.poNumber);
  const engine = new PdfEngine({
    title: `Purchase Order ${data.poNumber}`,
    author: 'PEB CRM',
    subject: `PO ${data.poNumber}`,
  });

  const generatedAt = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const renderer = new SectionRenderer(engine);
  const calculator = new LayoutCalculator(engine);

  const tableItems = data.items.map((item, idx) => ({
    sno: idx + 1,
    name: item.name,
    description: item.description,
    hsn: item.hsn,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    discount: item.discount,
    discountType: item.discountType,
    gstRate: item.gstRate,
    amount: item.total,
  }));

  const headerData = {
    companyName: data.company.name || 'PEB Systems',
    companyAddress: data.company.address,
    companyPhone: data.company.phone,
    companyEmail: data.company.email,
    companyWebsite: data.company.website,
    companyGstin: data.company.gstin,
    poNumber: data.poNumber,
    poDate: data.poDate,
    revision: data.revision,
    status: data.status,
  };

  const orderInfoData = {
    paymentTerms: data.paymentTerms,
    expectedDelivery: data.expectedDelivery,
    currency: data.currency,
    projectName: data.projectName,
    warehouseName: data.warehouseName,
  };

  const addressLeft = {
    title: 'SHIP TO',
    company: data.buyer.company,
    name: data.buyer.name,
    address: data.buyer.address,
    city: data.buyer.city,
    state: data.buyer.state,
    pincode: data.buyer.pincode,
    phone: data.buyer.phone,
    email: data.buyer.email,
    gstin: data.buyer.gstin,
  };

  const addressRight = {
    title: 'SUPPLIER',
    company: data.supplier.company,
    name: data.supplier.name,
    address: data.supplier.address,
    city: data.supplier.city,
    state: data.supplier.state,
    pincode: data.supplier.pincode,
    phone: data.supplier.phone,
    email: data.supplier.email,
    gstin: data.supplier.gstin,
  };

  const tableData = {
    items: tableItems,
    currency: data.currency || 'INR',
  };

  const summaryData = {
    subtotal: data.subtotal,
    discount: data.discount,
    discountType: data.discountType,
    cgst: data.cgst,
    sgst: data.sgst,
    igst: data.igst,
    packing: data.packing,
    freight: data.freight,
    transport: data.transport,
    other: data.other,
    roundOff: data.roundOff,
    grandTotal: data.grandTotal,
    currency: data.currency,
  };

  const termsData = {
    terms: data.terms,
  };

  const signatureData = {
    companyName: data.company.name,
  };

  const footerData = {
    companyName: data.company.name,
    generatedAt,
    pageNum: 1,
    totalPages: 1,
  };

  const headerDims = renderer.measureHeader(headerData);
  const orderInfoDims = renderer.measureOrderInfo(orderInfoData);
  const addressDims = renderer.measureAddress(addressLeft, addressRight);
  const summaryDims = renderer.measureSummary(summaryData);
  const termsDims = renderer.measureTerms(termsData);
  const signaturesDims = renderer.measureSignatures(signatureData);
  const footerDims = renderer.measureFooter(footerData);

  const rowHeights = tableItems.map((item) => {
    const doc = engine.doc;
    const cw = engine.getContentWidth();
    const itemColWidth = Math.max(110, cw - 318);
    const nameLines = doc.heightOfString(item.name, { width: itemColWidth - 10 }) / 7;
    const descLines = item.description
      ? doc.heightOfString(item.description, { width: itemColWidth - 10 }) / 6.5
      : 0;
    return Math.max((nameLines + descLines) * 9.3 + 7, 18);
  });

  const plan = calculator.calculateLayout(
    {
      header: headerDims,
      orderInfo: orderInfoDims,
      address: addressDims,
      table: {
        height: 18 + rowHeights.reduce((a, b) => a + b, 0),
        minHeight: 36,
        preferredHeight: 18 + rowHeights.reduce((a, b) => a + b, 0),
        maxHeight: 18 + rowHeights.reduce((a, b) => a + b, 0),
      },
      summary: summaryDims,
      amountInWords: { height: 0, minHeight: 0, preferredHeight: 0, maxHeight: 0 },
      terms: termsDims,
      signatures: signaturesDims,
      footer: footerDims,
    },
    tableItems.length,
    rowHeights,
  );

  footerData.totalPages = plan.totalPages;

  let currentY = engine.getMargin().top;

  currentY = renderer.renderHeader(headerData, currentY) + GAP;
  currentY = renderer.renderOrderInfo(orderInfoData, currentY) + GAP;
  currentY = renderer.renderAddress(addressLeft, addressRight, currentY) + GAP;

  const page1End = plan.page1.tableRows;
  currentY = renderer.renderTable(tableData, currentY, 0, page1End) + GAP;
  currentY = renderer.renderSummary(summaryData, currentY) + GAP;
  currentY = renderer.renderTerms(termsData, currentY) + GAP;
  currentY = renderer.renderSignatures(signatureData, currentY);

  const footerY = engine.doc.page.height - 38;
  footerData.pageNum = 1;
  renderer.renderFooter(footerData, footerY);

  let startIndex = page1End;
  for (let i = 0; i < plan.continuationPages.length; i++) {
    const page = plan.continuationPages[i];
    engine.addPage();
    currentY = engine.getMargin().top + 20;

    engine.doc.font('Calibri-Bold').fontSize(10).fillColor('#1e3a8a');
    engine.doc.text(
      `PURCHASE ORDER  ·  ${data.poNumber}  (continued)`,
      engine.getMargin().left,
      currentY,
      {
        lineBreak: false,
      },
    );
    currentY += 15;

    const endIndex = startIndex + page.tableRows;
    currentY = renderer.renderTable(tableData, currentY, startIndex, endIndex);

    footerData.pageNum = i + 2;
    renderer.renderFooter(footerData, footerY);

    startIndex = endIndex;
  }

  return engine.finalize();
}
