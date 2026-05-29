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

/**
 * Leaderboard & competitive surfaces: prefer @username (trail identity like my_z71_adventures),
 * not legal/Google profile name, when a handle exists.
 */
export function resolveLeaderboardDisplayName(p: ProfileIdentityFields | null | undefined): string {
  const handle = String(p?.username ?? '').trim().toLowerCase();
  if (handle) return `@${handle}`;
  return resolvePublicDisplayName(p);
}

function neutralRiderLabel(id: string | null | undefined): string {
  const tail = String(id ?? '').replace(/-/g, '').slice(-4);
  return tail.length >= 4 ? `Rider ${tail}` : 'Rider';
}

/** What everyone else sees (feed headers, other profiles, search). Never exposes real name or email. */
export function resolvePublicDisplayName(p: ProfileIdentityFields | null | undefined): string {
  const handle = String(p?.username ?? '').trim().toLowerCase();
  if (handle) return `@${handle}`;
  return neutralRiderLabel(p?.id);
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

/** Snapshot label for new posts, comments, reposts, SOS — @username only, never real name. */
export function snapshotPublicIdentity(
  profile: Record<string, unknown> | null | undefined,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
): string {
  return resolvePublicDisplayName({
    id: user.id,
    username: (profile?.username as string | undefined) ?? null,
  });
}
