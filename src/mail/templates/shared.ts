export type TemplateVars = Record<string, string | number | boolean | undefined | null>;

export function v(vars: TemplateVars, key: string, fallback = ''): string {
  const value = vars[key];
  if (value === undefined || value === null) return fallback;
  return String(value);
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeColor(vars: TemplateVars): string {
  const color = v(vars, 'primaryColor', '#0F766E');
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#0F766E';
}

export function otpCard(otp: string, color: string): string {
  return (
    `<div style="margin:20px 0;padding:16px 20px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;text-align:center">` +
    `<div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:8px">Verification code</div>` +
    `<div style="font-size:32px;letter-spacing:0.28em;font-weight:700;color:${color}">${escapeHtml(otp)}</div>` +
    `</div>`
  );
}

export function ctaButton(label: string, href: string, color: string): string {
  if (!href) return '';
  return (
    `<p style="margin:20px 0">` +
    `<a href="${escapeHtml(href)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">${escapeHtml(label)}</a>` +
    `</p>`
  );
}

export interface ContentParts {
  title: string;
  htmlBody: string;
  textBody: string;
}
