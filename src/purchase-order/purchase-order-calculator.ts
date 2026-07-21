export interface PoItemInput {
  quantity: number;
  rate: number;
  discount?: number;
  discountType?: string | null;
  gstRate?: number;
}

export interface PoItemCalculated {
  gstAmount: number;
  total: number;
  pendingQuantity: number;
}

export interface PoFinancialInput {
  items: PoItemInput[];
  discount?: number;
  discountType?: string | null;
  freight?: number;
  packingCharges?: number;
  shippingCharges?: number;
  otherCharges?: number;
}

export interface PoFinancialResult {
  itemDetails: PoItemCalculated[];
  subtotal: number;
  totalTax: number;
  discountAmount: number;
  afterDiscount: number;
  grandTotalBeforeRound: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
}

export function calculateItemTotals(item: PoItemInput): PoItemCalculated {
  const itemTotal = item.quantity * item.rate;
  const discountAmount =
    item.discountType === 'Percentage'
      ? (itemTotal * (item.discount || 0)) / 100
      : item.discount || 0;
  const afterDiscount = itemTotal - discountAmount;
  const gstAmount = item.gstRate ? (afterDiscount * item.gstRate) / 100 : 0;
  const total = afterDiscount + gstAmount;

  return {
    gstAmount: Math.round(gstAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    pendingQuantity: item.quantity,
  };
}

export function calculatePoFinancials(input: PoFinancialInput): PoFinancialResult {
  let subtotal = 0;
  let totalTax = 0;

  const itemDetails = input.items.map((item) => {
    const result = calculateItemTotals(item);
    const itemTotal = item.quantity * item.rate;
    const discountAmount =
      item.discountType === 'Percentage'
        ? (itemTotal * (item.discount || 0)) / 100
        : item.discount || 0;
    const afterDiscount = itemTotal - discountAmount;
    subtotal += afterDiscount;
    totalTax += result.gstAmount;
    return result;
  });

  const discountAmount =
    input.discountType === 'Percentage'
      ? (subtotal * (input.discount || 0)) / 100
      : input.discount || 0;
  const afterDiscount = subtotal - discountAmount;
  const grandTotalBeforeRound =
    afterDiscount +
    totalTax +
    (input.freight || 0) +
    (input.packingCharges || 0) +
    (input.shippingCharges || 0) +
    (input.otherCharges || 0);
  const roundOff = Math.round(grandTotalBeforeRound) - grandTotalBeforeRound;
  const grandTotal = grandTotalBeforeRound + roundOff;

  return {
    itemDetails,
    subtotal: Math.round(afterDiscount * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    afterDiscount: Math.round(afterDiscount * 100) / 100,
    grandTotalBeforeRound: Math.round(grandTotalBeforeRound * 100) / 100,
    roundOff: Math.round(roundOff * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    amountInWords: numberToWords(Math.round(grandTotal)),
  };
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };

  return 'Rupees ' + convert(num) + ' Only';
}

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  Draft: ['PendingApproval', 'Cancelled'],
  PendingApproval: ['Approved', 'Rejected', 'Draft'],
  Approved: ['Sent', 'Cancelled'],
  Rejected: ['Draft'],
  Sent: ['PartiallyReceived', 'Cancelled'],
  PartiallyReceived: ['FullyReceived', 'Cancelled'],
  FullyReceived: ['Closed'],
  Cancelled: [],
  Closed: [],
};

export function canTransitionStatus(from: string, to: string): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}
