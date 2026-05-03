/**
 * How we show names on profiles and denormalized snapshots (posts, SOS, etc.).
 */

export type ProfileIdentityFields = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  username?: string | null;
  hide_display_name?: boolean | null;
};

/** Stored lowercase; 3–24 chars, letters digits underscore */
export const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/;

/** Returns normalized username or null if empty / invalid */
export function normalizeUsername(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/^@+/g, '');
  if (!s) return null;
  return USERNAME_REGEX.test(s) ? s : null;
}

export function validateUsernameInput(raw: string): { ok: true; value: string | null } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  const s = trimmed.toLowerCase().replace(/^@+/g, '');
  if (s.length < 3) return { ok: false, message: 'Username must be at least 3 characters' };
  if (s.length > 24) return { ok: false, message: 'Username must be at most 24 characters' };
  if (!USERNAME_REGEX.test(s)) return { ok: false, message: 'Use letters, numbers, and underscores only' };
  return { ok: true, value: s };
}

/** What everyone else sees (feed headers, other profiles, search). */
export function resolvePublicDisplayName(p: ProfileIdentityFields | null | undefined): string {
  const hide = Boolean(p?.hide_display_name);
  const handle = String(p?.username ?? '').trim().toLowerCase();
  if (hide) {
    if (handle) return `@${handle}`;
    const id = String(p?.id ?? '').replace(/-/g, '');
    const tail = id.slice(-4);
    return tail.length >= 4 ? `Rider ${tail}` : 'Rider';
  }
  const n = String(p?.name ?? '').trim();
  if (n) return n;
  const emailLocal = String(p?.email ?? '').split('@')[0]?.trim();
  if (emailLocal) return emailLocal;
  if (handle) return `@${handle}`;
  return 'Rider';
}

/** Signed-in user viewing their own profile / composer — ignores hide_display_name */
export function resolveOwnProfileDisplayName(p: ProfileIdentityFields | null | undefined): string {
  const n = String(p?.name ?? '').trim();
  if (n) return n;
  const emailLocal = String(p?.email ?? '').split('@')[0]?.trim();
  if (emailLocal) return emailLocal;
  const handle = String(p?.username ?? '').trim().toLowerCase();
  if (handle) return `@${handle}`;
  return 'Rider';
}

/** Snapshot label for new posts, comments, reposts, SOS — matches public rules */
export function snapshotPublicIdentity(
  profile: Record<string, unknown> | null | undefined,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
): string {
  const meta = user.user_metadata ?? {};
  const googleName =
    (meta.full_name as string | undefined)?.trim() ||
    (meta.name as string | undefined)?.trim() ||
    undefined;
  return resolvePublicDisplayName({
    id: user.id,
    email: (profile?.email as string | undefined) ?? user.email ?? null,
    name: (profile?.name as string | undefined)?.trim() || googleName || null,
    username: (profile?.username as string | undefined) ?? null,
    hide_display_name: profile?.hide_display_name === true,
  });
}
