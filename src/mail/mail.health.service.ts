import { Injectable } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailTransportService } from './mail.transport';
import type { MailHealthSnapshot } from './mail.types';

@Injectable()
export class MailHealthService {
  constructor(
    private readonly mail: MailService,
    private readonly transport: MailTransportService,
  ) {}

  getStatus(): MailHealthSnapshot {
    return this.mail.getMailHealth();
  }

  getDetailedStatus() {
    return {
      mail: this.getStatus(),
      config: this.transport.getConfigSnapshot(),
      queue: this.mail.getQueueSnapshot(),
      timestamp: new Date().toISOString(),
    };
  }

  async verifyNow() {
    const verified = await this.transport.forceVerify();
    return {
      verified,
      mail: this.getStatus(),
      timestamp: new Date().toISOString(),
    };
  }
}
