import { buildResetPasswordSuccessTemplate } from './reset-password.template';
import type { ContentParts, TemplateVars } from './shared';

export function buildPasswordChangedTemplate(vars: TemplateVars): ContentParts {
  return buildResetPasswordSuccessTemplate(vars);
}
