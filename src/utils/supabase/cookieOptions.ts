import type { CookieOptionsWithName } from '@supabase/ssr';

/**
 * True when the request host looks like local / LAN dev (no TLS).
 * Used when `x-forwarded-proto` is missing (common for `next dev`).
 */
export function hostnameLooksLikePrivateLan(host: string): boolean {
  const h = host.split(':')[0]?.toLowerCase() ?? '';
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.endsWith('.local') ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)
  );
}

/**
 * Auth cookies must use `secure: false` on plain HTTP (LAN phone → PC).
 * Otherwise the browser drops Set-Cookie and OAuth appears to "not stick".
 */
export function supabaseCookieOptions(secure: boolean): CookieOptionsWithName {
  return {
    path: '/',
    sameSite: 'lax',
    secure,
  };
}

export function cookieSecureFromMiddlewareUrl(nextUrl: URL): boolean {
  return nextUrl.protocol === 'https:';
}
