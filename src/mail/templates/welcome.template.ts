import { ContentParts, ctaButton, escapeHtml, safeColor, TemplateVars, v } from './shared';

export function buildWelcomeTemplate(vars: TemplateVars): ContentParts {
  const name = v(vars, 'userName', 'there');
  const company = v(vars, 'companyName', 'our platform');
  const support = v(vars, 'supportEmail', 'support');
  const color = safeColor(vars);

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
}
