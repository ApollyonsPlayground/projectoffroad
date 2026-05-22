import { isCapacitorNative } from '@/utils/capacitator/isNative';

/** OAuth / link-identity return URL for the current browser or native shell. */
export function buildOAuthRedirect(nextAfterLogin = '/feed/'): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const callbackPath = '/auth/callback/';
  const qs = `next=${encodeURIComponent(nextAfterLogin)}`;
  const native = isCapacitorNative();

  if (native) {
    return origin ? `${origin}${callbackPath}?native=1&${qs}` : `${callbackPath}?native=1&${qs}`;
  }
  return origin ? `${origin}${callbackPath}?${qs}` : `${callbackPath}?${qs}`;
}

export function readOAuthNextParam(): string {
  if (typeof window === 'undefined') return '/feed/';
  const raw = new URLSearchParams(window.location.search).get('next');
  if (raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('://')) {
    return raw.length > 2048 ? '/feed/' : raw;
  }
  return '/feed/';
}
