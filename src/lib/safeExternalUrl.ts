/** Allow only http(s) links for user-supplied club / profile URLs. */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const t = raw.trim();
  let url: URL;
  try {
    url = new URL(t.startsWith('http') ? t : `https://${t}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return url.toString();
}

export function instagramHref(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (t.startsWith('http')) return safeExternalUrl(t);
  const handle = t.replace(/^@/, '').trim();
  if (!handle) return null;
  return safeExternalUrl(`https://instagram.com/${encodeURIComponent(handle)}`);
}

export function websiteHref(raw: string | null): string | null {
  return safeExternalUrl(raw);
}
