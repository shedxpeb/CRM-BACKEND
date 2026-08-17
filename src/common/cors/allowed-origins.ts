/**
 * CORS origin allow-listing helpers.
 *
 * - Matching is case-insensitive and tolerant of trailing slashes: browsers send
 *   origins without a trailing slash, while env configs (e.g. FRONTEND_URL)
 *   frequently include one, which silently breaks every request.
 * - Besides an explicit allow-list, Vercel preview/production deployments
 *   (`*.vercel.app`) can be allowed via CORS_ALLOW_VERCEL_PREVIEW so new preview
 *   URLs work without touching backend env config.
 */

export interface OriginMatchOptions {
  /** Allow any `*.vercel.app` subdomain (Vercel preview + production deployments). */
  allowVercelApp?: boolean;
}

const VERCEL_APP_ORIGIN = /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/;

/** Normalize an origin for comparison: trim, lowercase, strip trailing slashes. */
export function normalizeOrigin(origin: string): string {
  return origin.trim().toLowerCase().replace(/\/+$/, '');
}

/** Split a comma-separated env value into normalized, de-duplicated origins. */
export function parseAllowedOrigins(value: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of value.split(',')) {
    const normalized = normalizeOrigin(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

/**
 * Whether a request origin should be allowed. Requests without an Origin header
 * (curl, mobile apps, server-to-server) are always allowed.
 */
export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[],
  options: OriginMatchOptions = {},
): boolean {
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);

  if (allowedOrigins.includes(normalized)) return true;

  if (options.allowVercelApp && VERCEL_APP_ORIGIN.test(normalized)) return true;

  return false;
}
