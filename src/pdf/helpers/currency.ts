export function formatCurrency(amount: number, currency = 'INR'): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (currency === 'INR') {
    return sign + '₹ ' + formatIndianNumber(absAmount);
  }
  return sign + '$ ' + absAmount.toFixed(2);
}

function formatIndianNumber(num: number): string {
  const parts = num.toFixed(2).split('.');
  let intPart = parts[0];
  const decPart = parts[1];

  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    intPart = formatted + ',' + last3;
  }

  return intPart + '.' + decPart;
}

export function formatNumber(num: number, decimals = 2): string {
  return num.toFixed(decimals);
}

export function formatQuantity(num: number): string {
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(2);
}

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
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertBelow1000(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertBelow1000(n % 100) : '');
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Rupees Zero Only';

  const rounded = Math.round(num);
  const intPart = Math.abs(rounded);

  const convert = (n: number): string => {
    if (n === 0) return '';
    if (n < 1000) return convertBelow1000(n);
    if (n < 100000) {
      const thousands = Math.floor(n / 1000);
      const remainder = n % 1000;
      return (
        convertBelow1000(thousands) + ' Thousand' + (remainder ? ' ' + convert(remainder) : '')
      );
    }
    if (n < 10000000) {
      const lakhs = Math.floor(n / 100000);
      const remainder = n % 100000;
      return convertBelow1000(lakhs) + ' Lakh' + (remainder ? ' ' + convert(remainder) : '');
    }
    const crores = Math.floor(n / 10000000);
    const remainder = n % 10000000;
    return convertBelow1000(crores) + ' Crore' + (remainder ? ' ' + convert(remainder) : '');
  };

  const words = convert(intPart);
  return 'Rupees ' + words.trim() + ' Only';
}
