/**
 * Supabase public object URLs must include `/storage/v1/object/public/<bucket>/…`.
 * Legacy or hand-built URLs sometimes omit `public`, which yields HTTP 400.
 */
export function ensureStoragePublicObjectUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (!trimmed.includes('/storage/v1/object/')) return trimmed;
  if (trimmed.includes('/storage/v1/object/public/')) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const objectIdx = segments.indexOf('object');
    if (objectIdx >= 0 && segments[objectIdx + 1] && segments[objectIdx + 1] !== 'public') {
      segments.splice(objectIdx + 1, 0, 'public');
      parsed.pathname = '/' + segments.join('/');
      return parsed.toString();
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}
