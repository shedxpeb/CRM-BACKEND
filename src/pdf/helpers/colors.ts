export const BRAND = {
  primary: '#1e3a8a', // Corporate navy — mastheads, section headers, grand total
  secondary: '#3b82f6',
  accent: '#60a5fa',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#f59e0b',
  muted: '#5b6778',
  subtext: '#6b7280',
  light: '#f8fafc',
  border: '#d7dee8',
  darkBorder: '#9aa7b8',
  white: '#ffffff',
  black: '#17202a',
  faint: '#f3f6fb',
  rowAlt: '#f5f8fc',
  tableHeaderBg: '#1e3a8a',
  tableHeaderText: '#ffffff',
  tableBorder: '#dce3ee',
  summaryBg: '#f8fafc',
  summaryBorder: '#d7dee8',
  sectionHeaderBg: '#1e3a8a',
  sectionHeaderText: '#ffffff',
  grandTotalBg: '#1e3a8a',
  grandTotalText: '#ffffff',
} as const;

export const FONTS = {
  regular: 'Calibri',
  bold: 'Calibri-Bold',
  italic: 'Calibri-Italic',
  boldItalic: 'Calibri-BoldItalic',
} as const;

// A4 portrait (points). 1 mm = 2.83465 pt  =>  12 mm = 34 pt
export const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: { top: 34, bottom: 34, left: 34, right: 34 },
  contentWidth: 595.28 - 34 - 34,
  // Vertical boundary for body content. Space below is reserved for the
  // signature footer (prepared/checked/approved/vendor/seal) so it never
  // needs its own page. Footer needs ~66 points, so set bodyBottom accordingly.
  bodyBottom: 841.89 - 80,
} as const;
