export const BRAND = {
  primary: '#1e3a8a', // Dark blue for headers
  secondary: '#3b82f6',
  accent: '#60a5fa',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#f59e0b',
  muted: '#64748b',
  light: '#f8fafc',
  border: '#e2e8f0',
  darkBorder: '#94a3b8',
  white: '#ffffff',
  black: '#0f172a',
  tableHeaderBg: '#1e3a8a',
  tableHeaderText: '#ffffff',
  tableAltRow: '#f1f5f9',
  tableBorder: '#e2e8f0',
  summaryBg: '#f8fafc',
  summaryBorder: '#e2e8f0',
  sectionHeaderBg: '#1e3a8a',
  sectionHeaderText: '#ffffff',
  panelBg: '#f8fafc',
  panelBorder: '#e2e8f0',
  panelHeaderBg: '#1e3a8a',
  panelHeaderText: '#ffffff',
  lightBlue: '#eff6ff',
  mediumBlue: '#bfdbfe',
  darkBlue: '#1e3a8a',
  grandTotalBg: '#1e3a8a',
  grandTotalText: '#ffffff',
} as const;

export const FONTS = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
  boldItalic: 'Helvetica-BoldOblique',
} as const;

export const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: { top: 35, bottom: 64, left: 35, right: 35 },
  contentWidth: 595.28 - 35 - 35,
} as const;
