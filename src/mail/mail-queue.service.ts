import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailJob {
  id: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  templateId?: string;
  attempts: number;
}

type Sender = (job: MailJob) => Promise<void>;

/**
 * In-process mail queue — never blocks API response.
 * Falls back to direct send if queue is disabled or saturated.
 */
@Injectable()
export class MailQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(MailQueueService.name);
  private readonly queue: MailJob[] = [];
  private active = 0;
  private sender: Sender | null = null;
  private stopped = false;
  private readonly enabled: boolean;
  private readonly concurrency: number;
  private seq = 0;

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<boolean>('mail.queueEnabled') !== false;
    this.concurrency = this.config.get<number>('mail.queueConcurrency') || 2;
  }

  setSender(sender: Sender) {
    this.sender = sender;
  }

  enqueue(job: Omit<MailJob, 'id' | 'attempts'>): void {
    const full: MailJob = {
      ...job,
      id: `mail_${Date.now()}_${++this.seq}`,
      attempts: 0,
    };

    if (!this.enabled || !this.sender) {
      this.direct(full);
      return;
    }

    this.queue.push(full);
    this.pump();
  }

  private pump() {
    if (this.stopped || !this.sender) return;
    while (this.active < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.active++;
      this.sender(job)
        .catch((err) => {
          job.attempts += 1;
          this.logger.error(`Mail job ${job.id} failed (attempt ${job.attempts}): ${err?.message || err}`);
          if (job.attempts < 3) {
            this.queue.push(job);
          }
        })
        .finally(() => {
          this.active--;
          this.pump();
        });
    }
  }

  private direct(job: MailJob) {
    if (!this.sender) {
      this.logger.warn(`No mail sender registered — dropped email to ${job.to}`);
      return;
    }
    this.sender(job).catch((err) => {
      this.logger.error(`Direct mail send failed to ${job.to}: ${err?.message || err}`);
    });
  }

  onModuleDestroy() {
    this.stopped = true;
  }
}
