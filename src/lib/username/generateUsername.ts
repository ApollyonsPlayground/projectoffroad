import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeUsername } from '@/lib/profileDisplay';

const ADJECTIVES = [
  'dust',
  'ridge',
  'rock',
  'trail',
  'dune',
  'mesa',
  'canyon',
  'pine',
  'sand',
  'mud',
  'peak',
  'wild',
  'grit',
  'iron',
  'red',
] as const;

const NOUNS = [
  'runner',
  'crawler',
  'rider',
  'explorer',
  'scout',
  'seeker',
  'tracker',
  'nomad',
  'pilot',
  'roamer',
  'builder',
  'overlander',
] as const;

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

/** One fabricated handle candidate (may still collide). */
export function generateUsernameCandidate(): string {
  const adj = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const noun = NOUNS[randomInt(NOUNS.length)];
  const suffix = randomInt(900) + 10;
  const raw = `${adj}_${noun}_${suffix}`;
  return normalizeUsername(raw) ?? `rider_${suffix}`;
}

async function usernameTaken(
  supabase: SupabaseClient,
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  let q = supabase.from('users').select('id').eq('username', username);
  if (excludeUserId) q = q.neq('id', excludeUserId);
  const { data, error } = await q.maybeSingle();
  if (error) {
    console.warn('[username] uniqueness check:', error.message);
    return true;
  }
  return Boolean(data);
}

/**
 * Assign a unique @username to a user who doesn't have one yet.
 * Returns the assigned handle or null if all attempts failed.
 */
export async function assignUniqueUsername(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('users')
    .select('username')
    .eq('id', userId)
    .maybeSingle();

  const current = normalizeUsername(String(existing?.username ?? ''));
  if (current) return current;

  for (let i = 0; i < 8; i++) {
    const candidate = generateUsernameCandidate();
    const taken = await usernameTaken(supabase, candidate, userId);
    if (taken) continue;

    const { error } = await supabase
      .from('users')
      .update({ username: candidate, hide_display_name: true })
      .eq('id', userId)
      .is('username', null);

    if (!error) return candidate;

    if (error.code === '23505') continue;
    console.warn('[username] assign failed:', error.message);
    return null;
  }

  const fallback = normalizeUsername(`rider_${userId.replace(/-/g, '').slice(0, 12)}`);
  if (!fallback) return null;
  const { error: fbErr } = await supabase
    .from('users')
    .update({ username: fallback, hide_display_name: true })
    .eq('id', userId)
    .is('username', null);
  if (fbErr) {
    console.warn('[username] fallback assign failed:', fbErr.message);
    return null;
  }
  return fallback;
}
