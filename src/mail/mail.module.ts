import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailQueueService } from './mail-queue.service';
import { BrandingService } from './branding.service';
import { MailProviderFactory } from './mail.provider';
import { MailTransportService } from './mail.transport';
import { MailHealthService } from './mail.health.service';
import { MailController } from './mail.controller';

@Global()
@Module({
  controllers: [MailController],
  providers: [
    MailProviderFactory,
    MailTransportService,
    MailQueueService,
    BrandingService,
    MailService,
    MailHealthService,
  ],
  exports: [
    MailService,
    MailQueueService,
    BrandingService,
    MailTransportService,
    MailHealthService,
  ],
})
export class MailModule {}
