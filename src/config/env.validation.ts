/**
 * Resolve a value from the nested config object first, then fall back to process.env.
 * The config object uses the shape produced by configuration.ts (e.g. config.smtp.user).
 * For nested keys we flatten to UPPER_SNAKE to check process.env.
 */
function resolve(config: Record<string, unknown> | undefined, key: string): string | undefined {
  // Try flat config first (env-file style keys like SMTP_USER)
  if (config && typeof config[key] === 'string' && (config[key] as string).trim()) {
    return (config[key] as string).trim();
  }
  // Try process.env
  if (process.env[key]?.trim()) {
    return process.env[key]!.trim();
  }
  return undefined;
}

export function validateEnv(config?: Record<string, unknown>): void {
  const isProd = resolve(config, 'NODE_ENV') === 'production';
  const missing: string[] = [];

  const requireVar = (name: string) => {
    if (!resolve(config, name)) missing.push(name);
  };

  requireVar('DATABASE_URL');
  requireVar('JWT_SECRET');
  requireVar('COOKIE_SECRET');
  requireVar('FRONTEND_URL');
  requireVar('PORT');

  // Derive DIRECT_DATABASE_URL if not set
  const directUrl = resolve(config, 'DIRECT_DATABASE_URL');
  if (!directUrl) {
    const databaseUrl = resolve(config, 'DATABASE_URL');
    if (databaseUrl) {
      process.env.DIRECT_DATABASE_URL = databaseUrl.replace(/[?&]pgbouncer=true/g, '');
    }
  }

  if (isProd) {
    const weakSecrets = [
      'change-this-to-a-random-secret',
      'change-this-to-a-random-secret-at-least-32-chars',
      'change-this-to-a-random-cookie-secret-at-least-32-chars',
      'BuildX-jwt-secret-dev-only',
      'BuildX-cookie-secret-dev-only',
      'REPLACE_WITH_RANDOM_SECRET_AT_LEAST_32_CHARS',
      'REPLACE_WITH_RANDOM_COOKIE_SECRET_AT_LEAST_32',
    ];
    const jwtSecret = resolve(config, 'JWT_SECRET');
    if (
      !jwtSecret ||
      jwtSecret.length < 32 ||
      weakSecrets.includes(jwtSecret)
    ) {
      throw new Error('JWT_SECRET must be a strong secret of at least 32 characters in production');
    }
    const cookieSecret = resolve(config, 'COOKIE_SECRET');
    if (
      !cookieSecret ||
      cookieSecret.length < 32 ||
      weakSecrets.includes(cookieSecret)
    ) {
      throw new Error(
        'COOKIE_SECRET must be a strong secret of at least 32 characters in production',
      );
    }
    const frontendUrl = resolve(config, 'FRONTEND_URL') || '';
    if (/localhost|127\.0\.0\.1/i.test(frontendUrl)) {
      throw new Error('FRONTEND_URL must not point to localhost in production');
    }
    if (resolve(config, 'COOKIE_SECURE') !== 'true') {
      throw new Error('COOKIE_SECURE must be true in production');
    }
    // SMTP required in production for auth emails
    ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_EMAIL'].forEach(requireVar);
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Copy .env.example to .env and set valid values.',
    );
  }

  // Startup diagnostics — log presence, never log values
  const keys = ['NODE_ENV', 'PORT', 'DATABASE_URL', 'JWT_SECRET', 'COOKIE_SECRET', 'FRONTEND_URL', 'COOKIE_SECURE', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_EMAIL'];
  const status = keys.map(k => `${k}=${resolve(config, k) ? 'SET' : 'MISSING'}`).join('  ');
  console.log(`[Config] Environment check: ${status}`);
}
