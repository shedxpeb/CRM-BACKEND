function appendPoolParams(url: string): string {
  if (!url) return url;
  const hasConnectionLimit = /[?&]connection_limit=/.test(url);
  const hasPoolTimeout = /[?&]pool_timeout=/.test(url);

  const limit = process.env.DB_CONNECTION_LIMIT || '20';
  const timeout = process.env.DB_POOL_TIMEOUT || '10';

  // If URL already has query params, append; otherwise add ? prefix
  const separator = url.includes('?') ? '&' : '?';
  let result = url;
  if (!hasConnectionLimit) {
    result += `${separator}connection_limit=${limit}`;
  }
  if (!hasPoolTimeout) {
    result += `${separator}pool_timeout=${timeout}`;
  }
  return result;
}

export function getPrismaConnectionUrl(): string {
  const raw = (
    process.env.DIRECT_DATABASE_URL ||
    process.env.DATABASE_URL?.replace(/[?&]pgbouncer=true/g, '') ||
    process.env.DATABASE_URL ||
    ''
  );
  return appendPoolParams(raw);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
