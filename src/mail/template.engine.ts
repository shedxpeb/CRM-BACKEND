/**
 * Deliverability-focused email template engine.
 * - multipart text + HTML (always both)
 * - inline CSS only, system fonts, no JS / tracking / external assets required
 * - dynamic branding via {{placeholders}} / vars — never hardcode company identity
 * - minimized HTML for Gmail / Outlook / Apple Mail / Zoho
 */

export type MailTemplateId =
  | 'welcome'
  | 'register_otp'
  | 'forgot_password_otp'
  | 'reset_password_success'
  | 'email_verification'
  | 'invitation'
  | 'password_changed'
  | 'account_locked'
  | 'account_unlocked'
  | 'organization_invitation'
  | 'magic_login'
  | 'session_alert'
  | 'security_alert';

export interface TemplateVars {
  [key: string]: string | number | boolean | undefined | null;
}

export interface BuiltMail {
  subject: string;
  html: string;
  text: string;
}

/** Calm, non-spammy subjects — avoid ALL CAPS, urgency, and excess punctuation */
const SUBJECTS: Record<MailTemplateId, string> = {
  welcome: 'Welcome to {{companyName}}',
  register_otp: 'Your {{companyName}} verification code',
  forgot_password_otp: 'Your {{companyName}} password reset code',
  reset_password_success: 'Your {{companyName}} password was updated',
  email_verification: 'Confirm your email for {{companyName}}',
  invitation: 'Invitation to {{companyName}}',
  password_changed: 'Your {{companyName}} password was updated',
  account_locked: 'Account access notice from {{companyName}}',
  account_unlocked: 'Account access restored for {{companyName}}',
  organization_invitation: 'Invitation to join {{companyName}}',
  magic_login: 'Your {{companyName}} sign-in link',
  session_alert: 'New sign-in on your {{companyName}} account',
  security_alert: 'Account activity notice from {{companyName}}',
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderPlaceholders(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const raw = vars[key];
    if (raw === undefined || raw === null) return '';
    return String(raw);
  });
}

/** Collapse whitespace and remove HTML comments — keep size small for spam filters */
export function minifyHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

function v(vars: TemplateVars, key: string, fallback = ''): string {
  const raw = vars[key];
  if (raw === undefined || raw === null || raw === '') return fallback;
  return String(raw);
}

function safeColor(vars: TemplateVars): string {
  const c = v(vars, 'primaryColor', '#0F766E');
  // Only allow simple hex colors (prevent style injection / odd spam patterns)
  return /^#[0-9A-Fa-f]{3,8}$/.test(c) ? c : '#0F766E';
}

function ctaButton(label: string, url: string, color: string): string {
  if (!url || !/^https?:\/\//i.test(url)) return '';
  const href = escapeHtml(url);
  const bg = escapeHtml(color);
  return (
    `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 8px 0">` +
    `<tr><td bgcolor="${bg}" style="background:${bg};border-radius:6px">` +
    `<a href="${href}" target="_blank" rel="noopener noreferrer" ` +
    `style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;` +
    `font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px">${escapeHtml(label)}</a>` +
    `</td></tr></table>`
  );
}

function otpCard(otp: string, color: string): string {
  if (!otp) return '';
  const bg = escapeHtml(color);
  return (
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0">` +
    `<tr><td align="center" class="otp-box" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:18px 12px">` +
    `<div class="email-muted" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748b;letter-spacing:0.4px;margin:0 0 8px 0">Your verification code</div>` +
    `<div style="font-family:Consolas,'Courier New',monospace;font-size:28px;line-height:1.2;font-weight:700;` +
    `letter-spacing:6px;color:${bg};user-select:all;-webkit-user-select:all">${escapeHtml(otp)}</div>` +
    `</td></tr></table>`
  );
}

/**
 * Shared layout: Header → Logo → Company → Title → Body → CTA/OTP → Support → Footer
 * One outer centering table + one content table only.
 */
function layout(vars: TemplateVars, title: string, bodyHtml: string): string {
  const color = safeColor(vars);
  const company = escapeHtml(v(vars, 'companyName', 'Account'));
  const logoUrl = v(vars, 'companyLogo');
  const support = escapeHtml(v(vars, 'supportEmail'));
  const website = v(vars, 'website');
  const address = escapeHtml(v(vars, 'address'));
  const phone = escapeHtml(v(vars, 'phone'));
  const year = escapeHtml(v(vars, 'year', String(new Date().getFullYear())));

  const logo = logoUrl && /^https?:\/\//i.test(logoUrl)
    ? `<img src="${escapeHtml(logoUrl)}" width="120" height="40" alt="${company}" ` +
      `style="display:block;border:0;outline:none;height:40px;width:auto;max-width:140px;margin:0 0 10px 0" />`
    : '';

  const supportBlock = support
    ? `<p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#64748b">` +
      `Questions? <a href="mailto:${support}" style="color:${escapeHtml(color)};text-decoration:underline">${support}</a></p>`
    : '';

  const webBlock = website && /^https?:\/\//i.test(website)
    ? `<p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5">` +
      `<a href="${escapeHtml(website)}" style="color:#64748b;text-decoration:underline">${escapeHtml(website.replace(/^https?:\/\//i, ''))}</a></p>`
    : '';

  const contactLine = [address, phone].filter(Boolean).join(' · ');

  return minifyHtml(`<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${escapeHtml(title)}</title>
<!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif !important}</style><![endif]-->
<style type="text/css">
@media (prefers-color-scheme: dark) {
  body, .email-bg { background-color: #0f172a !important; }
  .email-card { background-color: #1e293b !important; border-color: #334155 !important; }
  .email-body, .email-title { color: #f1f5f9 !important; }
  .email-muted { color: #94a3b8 !important; }
  .email-footer { background-color: #0f172a !important; border-color: #334155 !important; }
  .otp-box { background-color: #0f172a !important; border-color: #334155 !important; }
}
</style>
</head>
<body class="email-bg" style="margin:0;padding:0;background-color:#f1f5f9;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<table role="presentation" class="email-bg" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" class="email-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e2e8f0">
<tr>
<td style="padding:20px 24px;border-bottom:3px solid ${escapeHtml(color)}">
${logo}
<div style="font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:${escapeHtml(color)};line-height:1.3">${company}</div>
</td>
</tr>
<tr>
<td class="email-body" style="padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0f172a">
<h1 class="email-title" style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;line-height:1.3;color:#0f172a">${escapeHtml(title)}</h1>
${bodyHtml}
</td>
</tr>
<tr>
<td class="email-footer" style="padding:16px 24px;background-color:#f8fafc;border-top:1px solid #e2e8f0">
${supportBlock}
${webBlock}
${contactLine ? `<p class="email-muted" style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#64748b">${contactLine}</p>` : ''}
<p class="email-muted" style="margin:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.4;color:#94a3b8">&copy; ${year} ${company}. All rights reserved.</p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`);
}

function plainFooter(vars: TemplateVars): string {
  const lines = [
    '',
    '---',
    v(vars, 'companyName'),
    v(vars, 'supportEmail') ? `Support: ${v(vars, 'supportEmail')}` : '',
    v(vars, 'website'),
    [v(vars, 'address'), v(vars, 'phone')].filter(Boolean).join(' · '),
    `© ${v(vars, 'year', String(new Date().getFullYear()))} ${v(vars, 'companyName')}`,
  ].filter(Boolean);
  return lines.join('\n');
}

interface ContentParts {
  title: string;
  htmlBody: string;
  textBody: string;
}

function contentFor(id: MailTemplateId, vars: TemplateVars): ContentParts {
  const name = v(vars, 'userName', 'there');
  const otp = v(vars, 'otp');
  const expiry = v(vars, 'expiry', '10 minutes');
  const color = safeColor(vars);
  const company = v(vars, 'companyName', 'our platform');
  const support = v(vars, 'supportEmail', 'support');

  switch (id) {
    case 'register_otp':
    case 'email_verification':
      return {
        title: 'Your verification code',
        htmlBody:
          `<p style="margin:0 0 12px 0">Hi ${escapeHtml(name)},</p>` +
          `<p style="margin:0 0 12px 0">Use this code to verify your email for ${escapeHtml(company)}.</p>` +
          otpCard(otp, color) +
          `<p style="margin:0 0 8px 0;font-size:14px;color:#334155">Expires in <strong>${escapeHtml(expiry)}</strong>.</p>` +
          `<p style="margin:16px 0 0 0;font-size:13px;color:#64748b">If you did not request this, you can ignore this email.</p>`,
        textBody:
          `Hi ${name},\n\nYour verification code: ${otp}\nExpires in ${expiry}.\n\n` +
          `If you did not request this, you can ignore this email.`,
      };

    case 'forgot_password_otp':
      return {
        title: 'Password reset code',
        htmlBody:
          `<p style="margin:0 0 12px 0">Hi ${escapeHtml(name)},</p>` +
          `<p style="margin:0 0 12px 0">Use this code to reset your password.</p>` +
          otpCard(otp, color) +
          `<p style="margin:0 0 8px 0;font-size:14px;color:#334155">Expires in <strong>${escapeHtml(expiry)}</strong>.</p>` +
          `<p style="margin:16px 0 0 0;font-size:13px;color:#64748b">If you did not request a password reset, you can ignore this email.</p>`,
        textBody:
          `Hi ${name},\n\nYour password reset code: ${otp}\nExpires in ${expiry}.\n\n` +
          `If you did not request a password reset, you can ignore this email.`,
      };

    case 'welcome':
      return {
        title: `Welcome to ${company}`,
        htmlBody:
          `<p style="margin:0 0 12px 0">Hi ${escapeHtml(name)},</p>` +
          `<p style="margin:0 0 12px 0">Your account is ready. You can sign in and get started.</p>` +
          ctaButton('Open dashboard', v(vars, 'loginLink') || v(vars, 'website'), color) +
          `<p style="margin:16px 0 0 0;font-size:13px;color:#64748b">If you need help, contact ${escapeHtml(support)}.</p>`,
        textBody:
          `Hi ${name},\n\nWelcome to ${company}. Your account is ready.\n` +
          `${v(vars, 'loginLink') || v(vars, 'website')}\n\nNeed help? ${support}`,
      };

    case 'reset_password_success':
    case 'password_changed':
      return {
        title: 'Password updated',
        htmlBody:
          `<p style="margin:0 0 12px 0">Hi ${escapeHtml(name)},</p>` +
          `<p style="margin:0 0 12px 0">Your password was updated successfully.</p>` +
          `<p style="margin:16px 0 0 0;font-size:13px;color:#64748b">If you did not make this change, contact ${escapeHtml(support)}.</p>`,
        textBody:
          `Hi ${name},\n\nYour password was updated successfully.\n` +
          `If you did not make this change, contact ${support}.`,
      };

    case 'invitation':
    case 'organization_invitation':
      return {
        title: 'You are invited',
        htmlBody:
          `<p style="margin:0 0 12px 0">Hi ${escapeHtml(name)},</p>` +
          `<p style="margin:0 0 12px 0">You have been invited to join ${escapeHtml(company)}.</p>` +
          ctaButton('Accept invitation', v(vars, 'inviteLink'), color) +
          `<p style="margin:16px 0 0 0;font-size:13px;color:#64748b">If you were not expecting this invitation, you can ignore this email.</p>`,
        textBody:
          `Hi ${name},\n\nYou have been invited to join ${company}.\n${v(vars, 'inviteLink')}\n\n` +
          `If you were not expecting this invitation, you can ignore this email.`,
      };

    case 'magic_login':
      return {
        title: 'Sign-in link',
        htmlBody:
          `<p style="margin:0 0 12px 0">Hi ${escapeHtml(name)},</p>` +
          `<p style="margin:0 0 12px 0">Use the button below to sign in. This link expires in <strong>${escapeHtml(expiry)}</strong>.</p>` +
          ctaButton('Sign in', v(vars, 'magicLink'), color) +
          `<p style="margin:16px 0 0 0;font-size:13px;color:#64748b">If you did not request this, you can ignore this email.</p>`,
        textBody:
          `Hi ${name},\n\nSign in: ${v(vars, 'magicLink')}\nExpires in ${expiry}.\n\n` +
          `If you did not request this, you can ignore this email.`,
      };

    case 'account_locked':
      return {
        title: 'Account access notice',
        htmlBody:
          `<p style="margin:0 0 12px 0">Hi ${escapeHtml(name)},</p>` +
          `<p style="margin:0 0 12px 0">Sign-in was temporarily paused after several unsuccessful attempts.</p>` +
          `<p style="margin:0 0 12px 0">You can try again later, or reset your password.</p>` +
          ctaButton('Reset password', v(vars, 'resetLink'), color) +
          `<p style="margin:16px 0 0 0;font-size:13px;color:#64748b">If you need help, contact ${escapeHtml(support)}.</p>`,
        textBody:
          `Hi ${name},\n\nSign-in was temporarily paused after several unsuccessful attempts.\n` +
          `Reset password: ${v(vars, 'resetLink')}\n\nNeed help? ${support}`,
      };

    case 'account_unlocked':
      return {
        title: 'Account access restored',
        htmlBody:
          `<p style="margin:0 0 12px 0">Hi ${escapeHtml(name)},</p>` +
          `<p style="margin:0 0 12px 0">Your account access has been restored. You can sign in again.</p>`,
        textBody: `Hi ${name},\n\nYour account access has been restored. You can sign in again.`,
      };

    case 'session_alert':
    case 'security_alert':
      return {
        title: 'Account activity notice',
        htmlBody:
          `<p style="margin:0 0 12px 0">Hi ${escapeHtml(name)},</p>` +
          `<p style="margin:0 0 12px 0">${escapeHtml(v(vars, 'alertMessage', 'We noticed recent activity on your account.'))}</p>` +
          `<p style="margin:0 0 4px 0;font-size:13px;color:#64748b">Device: ${escapeHtml(v(vars, 'device', 'Unknown'))}</p>` +
          `<p style="margin:0 0 4px 0;font-size:13px;color:#64748b">IP: ${escapeHtml(v(vars, 'ipAddress', 'Unknown'))}</p>` +
          `<p style="margin:0 0 12px 0;font-size:13px;color:#64748b">Time: ${escapeHtml(v(vars, 'timestamp', ''))}</p>` +
          ctaButton('Review account', v(vars, 'securityLink') || v(vars, 'website'), color) +
          `<p style="margin:16px 0 0 0;font-size:13px;color:#64748b">If this was you, no action is needed.</p>`,
        textBody:
          `Hi ${name},\n\n${v(vars, 'alertMessage', 'We noticed recent activity on your account.')}\n` +
          `Device: ${v(vars, 'device', 'Unknown')}\nIP: ${v(vars, 'ipAddress', 'Unknown')}\n` +
          `Time: ${v(vars, 'timestamp', '')}\n\nIf this was you, no action is needed.`,
      };

    default:
      return {
        title: company,
        htmlBody:
          `<p style="margin:0 0 12px 0">Hi ${escapeHtml(name)},</p>` +
          `<p style="margin:0">${escapeHtml(v(vars, 'message'))}</p>`,
        textBody: `Hi ${name},\n\n${v(vars, 'message')}`,
      };
  }
}

export function buildMailTemplate(id: MailTemplateId, vars: TemplateVars): BuiltMail {
  const flat: TemplateVars = { ...vars };
  const parts = contentFor(id, flat);
  const subject = renderPlaceholders(SUBJECTS[id], flat);
  const html = layout(flat, parts.title, parts.htmlBody);
  const text = `${parts.textBody}${plainFooter(flat)}`;
  return { subject, html, text };
}
