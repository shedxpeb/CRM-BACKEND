import { Controller, Get, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { MailHealthService } from './mail.health.service';
import { MailService } from './mail.service';

@Controller('mail')
@SkipThrottle()
export class MailController {
  constructor(
    private readonly health: MailHealthService,
    private readonly mail: MailService,
  ) {}

  @Get('health')
  @Public()
  getHealth() {
    return this.health.getStatus();
  }

  @Get('status')
  @Public()
  getStatus() {
    return this.health.getDetailedStatus();
  }

  @Get('jobs')
  @Public()
  getJobs() {
    return {
      ...this.mail.getQueueSnapshot(),
      note: 'In-process queue snapshot. Redis/BullMQ job listing can replace this without API changes.',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('verify')
  @Public()
  verify() {
    return this.health.verifyNow();
  }
}
