/**
 * Format an amount using Indian grouping for INR, plain toFixed(2) otherwise.
 * Negative amounts are prefixed with a minus sign.
 */
export function formatCurrency(amount: number, currency = 'INR'): string {
  const absAmount = Math.abs(amount || 0);
  const sign = amount < 0 ? '-' : '';

  if (currency === 'INR') {
    return `${sign}\u20B9 ${formatIndianNumber(absAmount)}`;
  }
  const symbol =
    currency === 'USD' ? '$ ' : currency === 'EUR' ? '\u20AC ' : currency + ' ';
  return `${sign}${symbol}${absAmount.toFixed(2)}`;
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
  return parseFloat(num.toFixed(2)).toString();
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
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertBelow1000(n % 100) : '');
}

function convertInt(n: number): string {
  if (n === 0) return '';
  if (n < 1000) return convertBelow1000(n);
  if (n < 100000) {
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    return (
      convertBelow1000(thousands) + ' Thousand' + (remainder ? ' ' + convertInt(remainder) : '')
    );
  }
  if (n < 10000000) {
    const lakhs = Math.floor(n / 100000);
    const remainder = n % 100000;
    return convertBelow1000(lakhs) + ' Lakh' + (remainder ? ' ' + convertInt(remainder) : '');
  }
  const crores = Math.floor(n / 10000000);
  const remainder = n % 10000000;
  return convertBelow1000(crores) + ' Crore' + (remainder ? ' ' + convertInt(remainder) : '');
}

/**
 * Indian-system amount in words, e.g.
 * "Rupees One Lakh Twenty Five Thousand Four Hundred Fifty Only"
 * or "Rupees One Thousand Two Hundred Thirty Four and Paise Fifty Six Only".
 */
export function numberToWords(num: number): string {
  const value = Math.abs(Math.round((num || 0) * 100) / 100);
  const rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);

  const rupeeWords = convertInt(rupees) || 'Zero';
  let words = 'Rupees ' + rupeeWords;
  if (paise > 0) {
    words += ' and Paise ' + convertInt(paise);
  }
  return words + ' Only';
}
