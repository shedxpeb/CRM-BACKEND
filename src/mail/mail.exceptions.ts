import { ServiceUnavailableException } from '@nestjs/common';
import type { SmtpFailureType } from './mail.types';

export class MailDeliveryUnavailableException extends ServiceUnavailableException {
  readonly failureType: SmtpFailureType;

  constructor(
    failureType: SmtpFailureType,
    clientMessage = 'Email delivery is temporarily unavailable',
  ) {
    super(clientMessage);
    this.failureType = failureType;
  }
}

export class MailTemplateUnavailableException extends ServiceUnavailableException {
  constructor() {
    super('Email template is unavailable');
  }
}
