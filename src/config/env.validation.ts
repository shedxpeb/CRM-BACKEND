export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const missing: string[] = [];

  const requireVar = (name: string) => {
    if (!process.env[name]?.trim()) {
      missing.push(name);
    }
  };

  requireVar('DATABASE_URL');
  requireVar('JWT_SECRET');
  requireVar('COOKIE_SECRET');
  requireVar('FRONTEND_URL');
  requireVar('PORT');

  if (!process.env.DIRECT_DATABASE_URL?.trim()) {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (databaseUrl) {
      process.env.DIRECT_DATABASE_URL = databaseUrl.replace(/[?&]pgbouncer=true/g, '');
    }
  }

  if (isProd) {
    if (process.env.JWT_SECRET === 'change-this-to-a-random-secret') {
      throw new Error('JWT_SECRET must be changed in production');
    }
    if (process.env.JWT_SECRET!.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Copy .env.example to .env and set valid values.',
    );
  }
}

export function applyConfigToProcessEnv(config: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      process.env[key] = String(value);
    }
  }
}
