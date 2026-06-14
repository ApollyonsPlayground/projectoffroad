import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function describeRunLocationError(error: PostgrestError | Error | null): string {
  if (!error) return 'Location update failed. Try again.';
  const msg = error.message ?? '';
  const code = 'code' in error ? (error.code ?? '') : '';

  if (code === '42501' || msg.toLowerCase().includes('row-level security')) {
    return 'You cannot share location on this run. Join the run first, then try again.';
  }
  if (code === '23503') {
    return 'Your profile is not ready yet. Sign out and back in, then try again.';
  }
  if (code === 'PGRST301' || msg.toLowerCase().includes('jwt')) {
    return 'Session expired — sign in again to share location.';
  }
  if (msg.includes('Not allowed to share location')) {
    return 'You cannot share location on this run. Join the run first, then try again.';
  }
  if (msg.includes('Sign in required')) {
    return 'Sign in to share your location.';
  }
  if (msg.includes('Invalid coordinates')) {
    return 'GPS returned invalid coordinates. Try again outdoors with a clear sky view.';
  }
  if (msg.trim()) return `Location update failed: ${msg}`;
  return 'Location update failed. Check your connection and try again.';
}

export async function upsertMyRunLocation(
  supabase: SupabaseClient,
  params: {
    runId: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { runId, latitude, longitude, accuracy } = params;

  if (!isValidCoordinate(latitude, longitude)) {
    return { ok: false, message: describeRunLocationError(new Error('Invalid coordinates')) };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { ok: false, message: 'Sign in to share your location.' };
  }

  const { error } = await supabase.rpc('upsert_my_run_location', {
    p_run_id: runId,
    p_latitude: latitude,
    p_longitude: longitude,
    p_accuracy: accuracy,
  });

  if (error) {
    const rpcMissing =
      error.code === 'PGRST202' ||
      error.message?.includes('upsert_my_run_location') ||
      error.message?.includes('Could not find the function');

    if (rpcMissing) {
      const userId = session.user.id;
      const { error: upsertError } = await supabase.from('user_locations').upsert(
        {
          run_id: runId,
          user_id: userId,
          latitude,
          longitude,
          accuracy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'run_id,user_id' }
      );
      if (upsertError) {
        return { ok: false, message: describeRunLocationError(upsertError) };
      }
      return { ok: true };
    }

    return { ok: false, message: describeRunLocationError(error) };
  }

  return { ok: true };
}
