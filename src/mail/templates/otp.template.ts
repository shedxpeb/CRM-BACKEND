import { ContentParts, escapeHtml, otpCard, safeColor, TemplateVars, v } from './shared';

/** Runtime-rendered OTP email — branding comes only from vars (DB/ENV). */
export function buildOtpTemplate(vars: TemplateVars): ContentParts {
  const name = v(vars, 'userName', 'there');
  const otp = v(vars, 'otp');
  const expiry = v(vars, 'expiry', `${v(vars, 'expiryMinutes', '10')} minutes`);
  const color = safeColor(vars);
  const company = v(vars, 'companyName', 'our platform');

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
}

export function buildForgotPasswordOtpTemplate(vars: TemplateVars): ContentParts {
  const name = v(vars, 'userName', 'there');
  const otp = v(vars, 'otp');
  const expiry = v(vars, 'expiry', `${v(vars, 'expiryMinutes', '10')} minutes`);
  const color = safeColor(vars);

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
}
