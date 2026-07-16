import type { Transporter, SendMailOptions, SentMessageInfo } from 'nodemailer';
import type { MailHealthSnapshot, MailProviderName, MailTransportSnapshot } from './mail.types';

export interface MailProviderDefinition {
  name: MailProviderName;
  createTransporter(): Transporter;
}

export interface MailTransportManager {
  getTransporter(): Transporter | null;
  isReady(): boolean;
  getHealth(): MailHealthSnapshot;
  getConfigSnapshot(): MailTransportSnapshot;
  sendMail(options: SendMailOptions): Promise<SentMessageInfo>;
  forceVerify(): Promise<boolean>;
}
