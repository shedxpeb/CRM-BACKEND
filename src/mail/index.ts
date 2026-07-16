export { MailService } from './mail.service';
export { MailQueueService } from './mail-queue.service';
export { BrandingService } from './branding.service';
export { MailTransportService } from './mail.transport';
export { MailHealthService } from './mail.health.service';
export { MailProviderFactory } from './mail.provider';
export { buildMailTemplate, minifyHtml, type MailTemplateId, type TemplateVars, type BuiltMail } from './template.engine';
export { buildMailHeaders, buildMessageId, formatFromAddress } from './mail.headers';
export type { MailHealthState, MailHealthSnapshot, SmtpFailureType, MailProviderName } from './mail.types';
export {
  MAIL_CONTENT_PERSISTENCE_RULE,
  sanitizeMailAuditMetadata,
  buildMailAuditMetadata,
  toPrismaJson,
} from './mail.policy';
export type { MailAuditJson } from './mail.policy';
