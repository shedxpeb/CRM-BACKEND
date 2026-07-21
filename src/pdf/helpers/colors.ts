export const BRAND = {
  primary: '#1a365d',
  secondary: '#2b6cb0',
  accent: '#3182ce',
  success: '#276749',
  danger: '#c53030',
  warning: '#d69e2e',
  muted: '#718096',
  light: '#f7fafc',
  border: '#cbd5e0',
  darkBorder: '#a0aec0',
  white: '#ffffff',
  black: '#1a202c',
  tableHeaderBg: '#1a365d',
  tableHeaderText: '#ffffff',
  tableAltRow: '#f7fafc',
  tableBorder: '#e2e8f0',
  summaryBg: '#f7fafc',
  summaryBorder: '#cbd5e0',
} as const;

export const FONTS = {
  regular: 'Calibri',
  bold: 'Calibri-Bold',
  italic: 'Calibri-Italic',
  boldItalic: 'Calibri-BoldItalic',
} as const;

export const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: { top: 40, bottom: 50, left: 40, right: 40 },
  contentWidth: 595.28 - 40 - 40,
} as const;
