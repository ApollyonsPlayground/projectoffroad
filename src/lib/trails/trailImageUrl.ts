/**
 * Never hotlink onX-hosted trail imagery (their CDN / pages — licensing risk).
 * Trail **page** links (`onxUrl`) stay elsewhere; this only sanitizes hero/card image URLs.
 */
export function sanitizeTrailHeroImageUrl(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  let hostname = '';
  try {
    hostname = new URL(s).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  if (hostname === 'onxmaps.com' || hostname.endsWith('.onxmaps.com')) return undefined;
  return s;
}
