import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailJob {
  id: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  templateId?: string;
  requestId?: string;
  purpose?: string;
  attempts: number;
  nextAttemptAt?: number;
}

type Sender = (job: MailJob) => Promise<void>;

/**
 * In-process mail queue with exponential backoff.
 * For multi-instance production, replace with Redis/Bull — interface stays the same.
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
  private readonly maxAttempts: number;
  private seq = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<boolean>('mail.queueEnabled') !== false;
    this.concurrency = this.config.get<number>('mail.queueConcurrency') || 2;
    this.maxAttempts = this.config.get<number>('mail.queueMaxAttempts') || 5;
    this.timer = setInterval(() => this.pump(), 1000);
  }

  setSender(sender: Sender) {
    this.sender = sender;
  }

  enqueue(job: Omit<MailJob, 'id' | 'attempts'>): void {
    const full: MailJob = {
      ...job,
      id: `mail_${Date.now()}_${++this.seq}`,
      attempts: 0,
      nextAttemptAt: Date.now(),
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
    const now = Date.now();
    while (this.active < this.concurrency && this.queue.length > 0) {
      const readyIdx = this.queue.findIndex((j) => (j.nextAttemptAt || 0) <= now);
      if (readyIdx < 0) break;
      const [job] = this.queue.splice(readyIdx, 1);
      this.active++;
      this.sender(job)
        .catch((err) => {
          job.attempts += 1;
          this.logger.error(
            `Mail job ${job.id} failed (attempt ${job.attempts}): ${err?.message || err}`,
          );
          if (job.attempts < this.maxAttempts) {
            const backoffMs = Math.min(60_000, 1000 * Math.pow(2, job.attempts));
            job.nextAttemptAt = Date.now() + backoffMs;
            this.queue.push(job);
          } else {
            this.logger.error(
              `Mail job ${job.id} dropped after ${job.attempts} attempts (to=${job.to})`,
            );
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
      this.logger.error(`No mail sender registered — dropped email to ${job.to}`);
      return;
    }
    this.sender(job).catch((err) => {
      this.logger.error(`Direct mail send failed to ${job.to}: ${err?.message || err}`);
    });
  }

  async onModuleDestroy() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    // Brief drain window for in-flight jobs
    const deadline = Date.now() + 3000;
    while (this.active > 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (this.queue.length > 0) {
      this.logger.warn(`Mail queue shutting down with ${this.queue.length} pending job(s)`);
    }
  }

  getPendingCount(): number {
    return this.queue.length + this.active;
  }
}

/** Helper for callers that must fail closed when SMTP cannot deliver */
export function assertMailDeliverable(ready: boolean, nodeEnv: string) {
  if (!ready && nodeEnv === 'production') {
    throw new ServiceUnavailableException('Email delivery is unavailable. Try again later.');
  }
}
