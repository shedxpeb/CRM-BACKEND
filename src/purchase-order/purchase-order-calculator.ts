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

// Helper function to round to 2 decimal places for currency calculations
const roundTo2 = (value: number): number => Math.round(value * 100) / 100;

export function calculateItemTotals(item: PoItemInput): PoItemCalculated {
  const quantity = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const itemTotal = roundTo2(quantity * rate);
  
  const discountValue = Number(item.discount) || 0;
  const discountAmount =
    item.discountType === 'Percentage'
      ? roundTo2((itemTotal * discountValue) / 100)
      : discountValue;
  const afterDiscount = roundTo2(itemTotal - discountAmount);
  
  const gstRate = Number(item.gstRate) || 0;
  const gstAmount = gstRate ? roundTo2((afterDiscount * gstRate) / 100) : 0;
  const total = roundTo2(afterDiscount + gstAmount);

  return {
    gstAmount,
    total,
    pendingQuantity: quantity,
  };
}

export function calculatePoFinancials(input: PoFinancialInput): PoFinancialResult {
  let subtotal = 0;
  let totalTax = 0;

  const itemDetails = input.items.map((item) => {
    const result = calculateItemTotals(item);
    
    const quantity = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const itemTotal = roundTo2(quantity * rate);
    
    const discountValue = Number(item.discount) || 0;
    const discountAmount =
      item.discountType === 'Percentage'
        ? roundTo2((itemTotal * discountValue) / 100)
        : discountValue;
    const afterDiscount = roundTo2(itemTotal - discountAmount);
    
    subtotal = roundTo2(subtotal + afterDiscount);
    totalTax = roundTo2(totalTax + result.gstAmount);
    
    return result;
  });

  const discountValue = Number(input.discount) || 0;
  const discountAmount =
    input.discountType === 'Percentage'
      ? roundTo2((subtotal * discountValue) / 100)
      : discountValue;
  const afterDiscount = roundTo2(subtotal - discountAmount);
  
  const freightValue = Number(input.freight) || 0;
  const packingValue = Number(input.packingCharges) || 0;
  const shippingValue = Number(input.shippingCharges) || 0;
  const otherValue = Number(input.otherCharges) || 0;
  
  const grandTotalBeforeRound = roundTo2(
    afterDiscount +
    totalTax +
    freightValue +
    packingValue +
    shippingValue +
    otherValue
  );
  const roundOff = roundTo2(Math.round(grandTotalBeforeRound) - grandTotalBeforeRound);
  const grandTotal = roundTo2(grandTotalBeforeRound + roundOff);

  return {
    itemDetails,
    subtotal,
    totalTax,
    discountAmount,
    afterDiscount,
    grandTotalBeforeRound,
    roundOff,
    grandTotal,
    amountInWords: numberToWords(Math.round(grandTotal)),
  };
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000)
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000)
      return (
        convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
      );
    if (n < 10000000)
      return (
        convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
      );
    return (
      convert(Math.floor(n / 10000000)) +
      ' Crore' +
      (n % 10000000 ? ' ' + convert(n % 10000000) : '')
    );
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
