import { NextRequest, NextResponse } from 'next/server';

/** Legacy routes that must not be used — app talks to Supabase directly. */
export function disabledLegacyApiResponse(): NextResponse {
  return NextResponse.json(
    { error: 'This API route is disabled. Update the app from the live site.' },
    { status: 410 }
  );
}

/** Cron must present CRON_SECRET; User-Agent alone is not trusted. */
export function authorizeCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization')?.trim() ?? '';
  return auth === `Bearer ${secret}`;
}

/** Escape user input for PostgREST `.or()` filter strings. */
export function escapePostgrestFilterValue(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/,/g, '');
}

export function genericApiError(
  logLabel: string,
  err: unknown,
  publicMessage = 'Request failed'
): NextResponse {
  console.error(logLabel, err);
  return NextResponse.json({ error: publicMessage }, { status: 500 });
}

/** Mitigate cross-site POST against cookie-authenticated routes. */
export function assertTrustedBrowserRequest(request: Request): boolean {
  const requestedWith = request.headers.get('x-requested-with');
  if (requestedWith !== 'SoCalOffroaders') return false;

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const geocodeHits = new Map<string, { count: number; resetAt: number }>();
const GEOCODE_WINDOW_MS = 60_000;
const GEOCODE_MAX_PER_WINDOW = 30;

export function geocodeRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || 'unknown';
}

export function checkGeocodeRateLimit(key: string): boolean {
  const now = Date.now();
  const row = geocodeHits.get(key);
  if (!row || now > row.resetAt) {
    geocodeHits.set(key, { count: 1, resetAt: now + GEOCODE_WINDOW_MS });
    return true;
  }
  if (row.count >= GEOCODE_MAX_PER_WINDOW) return false;
  row.count += 1;
  return true;
}
