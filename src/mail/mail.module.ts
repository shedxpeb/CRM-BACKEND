import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailQueueService } from './mail-queue.service';
import { BrandingService } from './branding.service';

@Global()
@Module({
  providers: [MailService, MailQueueService, BrandingService],
  exports: [MailService, MailQueueService, BrandingService],
})
export class MailModule {}
