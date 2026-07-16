/**
 * Reusable email template engine — no hardcoded company branding.
 * Templates are composed from layout + content; variables use {{placeholder}} syntax.
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

const SUBJECTS: Record<MailTemplateId, string> = {
  welcome: 'Welcome to {{companyName}}',
  register_otp: 'Your {{companyName}} verification code',
  forgot_password_otp: 'Reset your {{companyName}} password',
  reset_password_success: 'Your {{companyName}} password was reset',
  email_verification: 'Verify your email — {{companyName}}',
  invitation: 'You are invited to {{companyName}}',
  password_changed: 'Your {{companyName}} password was changed',
  account_locked: 'Your {{companyName}} account was locked',
  account_unlocked: 'Your {{companyName}} account was unlocked',
  organization_invitation: 'Join {{companyName}} on our platform',
  magic_login: 'Your {{companyName}} login link',
  session_alert: 'New sign-in to your {{companyName}} account',
  security_alert: 'Security alert for your {{companyName}} account',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderPlaceholders(template: string, vars: TemplateVars, html = false): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const raw = vars[key];
    if (raw === undefined || raw === null) return '';
    const str = String(raw);
    return html ? escapeHtml(str) : str;
  });
}

function button(label: string, url: string, color: string): string {
  if (!url) return '';
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
      <tr>
        <td style="border-radius:8px;background:${escapeHtml(color)};">
          <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;border-radius:8px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

function layout(vars: TemplateVars, bodyHtml: string): string {
  const color = String(vars.primaryColor || '#0F766E');
  const logo = vars.companyLogo
    ? `<img src="${escapeHtml(String(vars.companyLogo))}" alt="${escapeHtml(String(vars.companyName || ''))}" height="40" style="display:block;margin-bottom:12px;" />`
    : '';
  const social: string[] = [];
  if (vars.linkedin) social.push(`<a href="${escapeHtml(String(vars.linkedin))}" style="color:#64748b;margin-right:12px;">LinkedIn</a>`);
  if (vars.twitter) social.push(`<a href="${escapeHtml(String(vars.twitter))}" style="color:#64748b;margin-right:12px;">Twitter</a>`);
  if (vars.facebook) social.push(`<a href="${escapeHtml(String(vars.facebook))}" style="color:#64748b;">Facebook</a>`);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr>
          <td style="padding:24px 28px;border-bottom:3px solid ${escapeHtml(color)};">
            ${logo}
            <div style="font-size:18px;font-weight:700;color:${escapeHtml(color)};">${escapeHtml(String(vars.companyName || ''))}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;font-size:15px;line-height:1.6;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.5;">
            <div>Need help? <a href="mailto:${escapeHtml(String(vars.supportEmail || ''))}" style="color:${escapeHtml(color)};">${escapeHtml(String(vars.supportEmail || 'support'))}</a></div>
            ${vars.website ? `<div style="margin-top:6px;"><a href="${escapeHtml(String(vars.website))}" style="color:#64748b;">${escapeHtml(String(vars.website))}</a></div>` : ''}
            ${vars.address || vars.phone ? `<div style="margin-top:6px;">${escapeHtml([vars.address, vars.phone].filter(Boolean).join(' · '))}</div>` : ''}
            ${social.length ? `<div style="margin-top:10px;">${social.join('')}</div>` : ''}
            <div style="margin-top:12px;">© ${escapeHtml(String(vars.year || new Date().getFullYear()))} ${escapeHtml(String(vars.companyName || ''))}. All rights reserved.</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function contentFor(id: MailTemplateId, vars: TemplateVars): { htmlBody: string; text: string } {
  const name = String(vars.userName || 'there');
  const otp = String(vars.otp || '');
  const expiry = String(vars.expiry || '');
  const color = String(vars.primaryColor || '#0F766E');

  switch (id) {
    case 'register_otp':
    case 'email_verification':
    case 'forgot_password_otp':
      return {
        htmlBody: `
          <p>Hi ${escapeHtml(name)},</p>
          <p>Use this one-time code to continue:</p>
          <div style="font-size:28px;letter-spacing:6px;font-weight:700;color:${escapeHtml(color)};margin:20px 0;">${escapeHtml(otp)}</div>
          <p>This code expires in <strong>${escapeHtml(expiry)}</strong>.</p>
          <p style="color:#64748b;font-size:13px;">If you did not request this, you can safely ignore this email.</p>`,
        text: `Hi ${name},\n\nYour OTP is: ${otp}\nValid for: ${expiry}\n\nIf you did not request this, ignore this email.`,
      };
    case 'welcome':
      return {
        htmlBody: `
          <p>Hi ${escapeHtml(name)},</p>
          <p>Welcome aboard. Your account is ready.</p>
          ${button('Open Dashboard', String(vars.loginLink || vars.website || ''), color)}`,
        text: `Hi ${name},\n\nWelcome! Your account is ready.\n${vars.loginLink || vars.website || ''}`,
      };
    case 'reset_password_success':
    case 'password_changed':
      return {
        htmlBody: `
          <p>Hi ${escapeHtml(name)},</p>
          <p>Your password was changed successfully.</p>
          <p style="color:#64748b;font-size:13px;">If you did not make this change, contact support immediately at ${escapeHtml(String(vars.supportEmail || ''))}.</p>`,
        text: `Hi ${name},\n\nYour password was changed successfully.\nIf this wasn't you, contact ${vars.supportEmail || 'support'}.`,
      };
    case 'invitation':
    case 'organization_invitation':
      return {
        htmlBody: `
          <p>Hi ${escapeHtml(name)},</p>
          <p>You have been invited to join <strong>${escapeHtml(String(vars.companyName || ''))}</strong>.</p>
          ${button('Accept Invitation', String(vars.inviteLink || ''), color)}`,
        text: `Hi ${name},\n\nYou are invited to ${vars.companyName}.\n${vars.inviteLink || ''}`,
      };
    case 'magic_login':
      return {
        htmlBody: `
          <p>Hi ${escapeHtml(name)},</p>
          <p>Click below to sign in. This link expires in <strong>${escapeHtml(expiry)}</strong>.</p>
          ${button('Sign In', String(vars.magicLink || ''), color)}`,
        text: `Hi ${name},\n\nSign in: ${vars.magicLink || ''}\nExpires in ${expiry}.`,
      };
    case 'account_locked':
      return {
        htmlBody: `
          <p>Hi ${escapeHtml(name)},</p>
          <p>Your account was locked due to multiple failed sign-in attempts.</p>
          <p>If this was you, wait and try again, or reset your password.</p>
          ${button('Reset Password', String(vars.resetLink || ''), color)}`,
        text: `Hi ${name},\n\nYour account was locked. Reset: ${vars.resetLink || ''}`,
      };
    case 'account_unlocked':
      return {
        htmlBody: `<p>Hi ${escapeHtml(name)},</p><p>Your account has been unlocked. You can sign in again.</p>`,
        text: `Hi ${name},\n\nYour account has been unlocked.`,
      };
    case 'session_alert':
    case 'security_alert':
      return {
        htmlBody: `
          <p>Hi ${escapeHtml(name)},</p>
          <p>${escapeHtml(String(vars.alertMessage || 'We detected a security-related activity on your account.'))}</p>
          <p style="font-size:13px;color:#64748b;">Device: ${escapeHtml(String(vars.device || 'Unknown'))}<br/>IP: ${escapeHtml(String(vars.ipAddress || 'Unknown'))}<br/>Time: ${escapeHtml(String(vars.timestamp || ''))}</p>
          ${button('Review Security', String(vars.securityLink || vars.website || ''), color)}`,
        text: `Hi ${name},\n\n${vars.alertMessage || 'Security activity detected.'}\nDevice: ${vars.device}\nIP: ${vars.ipAddress}`,
      };
    default:
      return {
        htmlBody: `<p>Hi ${escapeHtml(name)},</p><p>${escapeHtml(String(vars.message || ''))}</p>`,
        text: `Hi ${name},\n\n${vars.message || ''}`,
      };
  }
}

export function buildMailTemplate(id: MailTemplateId, vars: TemplateVars): { subject: string; html: string; text: string } {
  const flat: TemplateVars = {
    ...vars,
    linkedin: (vars as any).socialLinks?.linkedin || vars.linkedin,
    twitter: (vars as any).socialLinks?.twitter || vars.twitter,
    facebook: (vars as any).socialLinks?.facebook || vars.facebook,
  };
  const { htmlBody, text } = contentFor(id, flat);
  return {
    subject: renderPlaceholders(SUBJECTS[id], flat),
    html: layout(flat, htmlBody),
    text: renderPlaceholders(text, flat),
  };
}
