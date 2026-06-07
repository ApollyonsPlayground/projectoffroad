import type { SupabaseClient } from '@supabase/supabase-js';

export type VotingEventStatus = 'draft' | 'active' | 'closed';

export type VotingEvent = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  status: VotingEventStatus;
};

export type TrailOption = {
  id: string;
  voting_event_id: string;
  title: string;
  description: string;
  difficulty: string;
  trail_id: string | null;
  image_url: string | null;
  is_night_run: boolean;
  sort_order: number;
};

export type UserVote = {
  id: string;
  voting_event_id: string;
  trail_option_id: string;
  user_id: string;
};

export type VotingResultRow = {
  option_id: string;
  title: string;
  vote_count: number;
  is_winner: boolean;
};

export type VotingPhase = 'coming_soon' | 'live' | 'results' | 'none';

export function resolveVotingPhase(event: VotingEvent | null, nowMs = Date.now()): VotingPhase {
  if (!event) return 'none';
  const starts = new Date(event.starts_at).getTime();
  const ends = new Date(event.ends_at).getTime();
  const now = nowMs;

  if (event.status === 'closed' || now >= ends) return 'results';
  if (event.status === 'draft' || now < starts) return 'coming_soon';
  if (event.status === 'active' && now >= starts && now < ends) return 'live';
  return 'coming_soon';
}

export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return '0s';
  const totalSec = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

/** Latest community vote event (single featured row). */
export async function fetchFeaturedVotingEvent(
  sb: SupabaseClient
): Promise<VotingEvent | null> {
  const { data, error } = await sb
    .from('voting_events')
    .select('id, title, description, starts_at, ends_at, status')
    .in('status', ['draft', 'active', 'closed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as VotingEvent;
}

export async function fetchTrailOptions(
  sb: SupabaseClient,
  eventId: string
): Promise<TrailOption[]> {
  const { data, error } = await sb
    .from('trail_options')
    .select('id, voting_event_id, title, description, difficulty, trail_id, image_url, is_night_run, sort_order')
    .eq('voting_event_id', eventId)
    .order('sort_order', { ascending: true });

  if (error || !data) return [];
  return data as TrailOption[];
}

export async function fetchUserVote(
  sb: SupabaseClient,
  eventId: string,
  userId: string
): Promise<UserVote | null> {
  const { data, error } = await sb
    .from('votes')
    .select('id, voting_event_id, trail_option_id, user_id')
    .eq('voting_event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserVote;
}

export async function castVote(
  sb: SupabaseClient,
  eventId: string,
  trailOptionId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await sb.from('votes').insert({
    voting_event_id: eventId,
    trail_option_id: trailOptionId,
    user_id: userId,
  });

  if (error) {
    const msg =
      error.code === '23505'
        ? 'You already voted in this event.'
        : error.message || 'Could not record vote.';
    return { ok: false, message: msg };
  }
  return { ok: true };
}

export async function fetchVotingResults(
  sb: SupabaseClient,
  eventId: string
): Promise<VotingResultRow[]> {
  const { data, error } = await sb.rpc('get_voting_results', { p_event_id: eventId });
  if (error || !data) return [];
  return (data as VotingResultRow[]).map((row) => ({
    option_id: String(row.option_id),
    title: String(row.title),
    vote_count: Number(row.vote_count),
    is_winner: Boolean(row.is_winner),
  }));
}
