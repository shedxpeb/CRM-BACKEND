export function getPrismaConnectionUrl(): string {
  return (
    process.env.DIRECT_DATABASE_URL ||
    process.env.DATABASE_URL?.replace(/[?&]pgbouncer=true/g, '') ||
    process.env.DATABASE_URL ||
    ''
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
