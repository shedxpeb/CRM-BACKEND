import { ContentParts, escapeHtml, TemplateVars, v } from './shared';

/** Sent after a password reset completes successfully. */
export function buildResetPasswordSuccessTemplate(vars: TemplateVars): ContentParts {
  const name = v(vars, 'userName', 'there');
  const support = v(vars, 'supportEmail', 'support');

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
}
