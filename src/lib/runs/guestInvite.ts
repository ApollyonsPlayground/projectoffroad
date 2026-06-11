/**
 * Run guest invite helpers (anonymous join via token link).
 */

const SITE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')) ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://socaloffroaders.com');

const DISPLAY_NAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9 ]*[a-zA-Z0-9])?$/;
const BLOCKED_WORDS = /(fuck|shit|asshole|nazi|rape)/i;

export type GuestInvitePreview = {
  run_id: string;
  title: string;
  date: string;
  meetup_location: string | null;
  status: string;
  max_redemptions: number;
  redemption_count: number;
  spots_remaining: number;
};

export type GuestInviteStatus = {
  active: boolean;
  invite_id?: string;
  max_redemptions?: number;
  redemption_count?: number;
  expires_at?: string;
  created_at?: string;
};

export type CreateGuestInviteResult = {
  invite_id: string;
  token: string;
  max_redemptions: number;
  expires_at: string;
};

export type RedeemGuestInviteResult = {
  run_id: string;
  display_name?: string;
  expires_at?: string;
  already_joined?: boolean;
};

export function buildGuestInviteUrl(runId: string, token: string): string {
  const base = SITE.replace(/\/$/, '');
  const q = new URLSearchParams({ token });
  return `${base}/runs/${encodeURIComponent(runId)}/join/?${q.toString()}`;
}

export function validateGuestDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 24) {
    return 'Trail name must be 3–24 characters';
  }
  if (!DISPLAY_NAME_RE.test(trimmed) && !/^[a-zA-Z0-9]{3,24}$/.test(trimmed)) {
    return 'Use letters and numbers only';
  }
  if (BLOCKED_WORDS.test(trimmed)) {
    return 'Please choose a different trail name';
  }
  return null;
}

export async function previewGuestInvite(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> },
  token: string
): Promise<GuestInvitePreview | null> {
  const { data, error } = await supabase.rpc('preview_run_guest_invite', { p_token: token });
  if (error || !data) return null;
  return data as GuestInvitePreview;
}

export async function fetchGuestInviteStatus(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> },
  runId: string
): Promise<GuestInviteStatus> {
  const { data, error } = await supabase.rpc('get_run_guest_invite_status', { p_run_id: runId });
  if (error) throw new Error(error.message);
  return (data ?? { active: false }) as GuestInviteStatus;
}

export async function createGuestInvite(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> },
  runId: string,
  maxGuests: number
): Promise<CreateGuestInviteResult> {
  const { data, error } = await supabase.rpc('create_run_guest_invite', {
    p_run_id: runId,
    p_max_guests: maxGuests,
  });
  if (error) throw new Error(error.message);
  return data as CreateGuestInviteResult;
}

export async function revokeGuestInvite(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> },
  runId: string
): Promise<void> {
  const { error } = await supabase.rpc('revoke_run_guest_invite', { p_run_id: runId });
  if (error) throw new Error(error.message);
}

export async function redeemGuestInvite(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> },
  token: string,
  displayName: string
): Promise<RedeemGuestInviteResult> {
  const { data, error } = await supabase.rpc('redeem_run_guest_invite', {
    p_token: token,
    p_display_name: displayName.trim(),
  });
  if (error) throw new Error(error.message);
  return data as RedeemGuestInviteResult;
}
