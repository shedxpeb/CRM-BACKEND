/**
 * Future infrastructure plug-in points (Phase 5 — not implemented).
 * Do not add fake implementations here; wire real providers when ready.
 */
export interface MailQueueProvider {
  /** Enqueue transactional email — today: in-process MailQueueService */
  enqueue(job: { to: string; subject: string; text: string; html?: string }): void;
}

export interface BackgroundJobProvider {
  /** Schedule deferred work — future: BullMQ / Redis / cron scheduler */
  schedule?(name: string, payload: unknown, runAt?: Date): Promise<string>;
}

export interface ObjectStorageProvider {
  /** Store binary uploads — future: S3 / Hostinger object storage */
  put?(key: string, body: Buffer, contentType: string): Promise<string>;
}

export interface RealtimeProvider {
  /** Push live updates — future: WebSockets / SSE */
  publish?(channel: string, event: string, payload: unknown): Promise<void>;
}

/** Registered at bootstrap when env flags enable external providers */
export const FUTURE_PROVIDERS = {
  mailQueue: null as MailQueueProvider | null,
  jobs: null as BackgroundJobProvider | null,
  storage: null as ObjectStorageProvider | null,
  realtime: null as RealtimeProvider | null,
};
