import type { SupabaseClient } from '@supabase/supabase-js';
import type { TrailOption, VotingEvent, VotingEventStatus } from '@/lib/voting/fetchVotingEvent';

export async function fetchAllVotingEvents(sb: SupabaseClient): Promise<VotingEvent[]> {
  const { data, error } = await sb
    .from('voting_events')
    .select('id, title, description, starts_at, ends_at, status')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as VotingEvent[];
}

export async function createVotingEvent(
  sb: SupabaseClient,
  input: {
    title: string;
    description: string;
    starts_at: string;
    ends_at: string;
    status: VotingEventStatus;
  }
): Promise<VotingEvent> {
  const { data, error } = await sb
    .from('voting_events')
    .insert(input)
    .select('id, title, description, starts_at, ends_at, status')
    .single();
  if (error) throw new Error(error.message);
  return data as VotingEvent;
}

export async function updateVotingEventStatus(
  sb: SupabaseClient,
  eventId: string,
  status: VotingEventStatus
): Promise<void> {
  const { error } = await sb.from('voting_events').update({ status }).eq('id', eventId);
  if (error) throw new Error(error.message);
}

export async function addTrailOption(
  sb: SupabaseClient,
  input: {
    voting_event_id: string;
    title: string;
    description: string;
    difficulty: string;
    trail_id?: string | null;
    image_url?: string | null;
    is_night_run: boolean;
    sort_order: number;
  }
): Promise<TrailOption> {
  const { data, error } = await sb
    .from('trail_options')
    .insert(input)
    .select(
      'id, voting_event_id, title, description, difficulty, trail_id, image_url, is_night_run, sort_order'
    )
    .single();
  if (error) throw new Error(error.message);
  return data as TrailOption;
}

export async function deleteTrailOption(sb: SupabaseClient, optionId: string): Promise<void> {
  const { error } = await sb.from('trail_options').delete().eq('id', optionId);
  if (error) throw new Error(error.message);
}
