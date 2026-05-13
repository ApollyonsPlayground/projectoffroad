'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Loads and toggles `user_saved_trails` for the signed-in user.
 */
export function useSavedTrailIds(
  supabaseClient: SupabaseClient | null,
  userId: string | undefined
) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabaseClient || !userId) {
      setSavedIds(new Set());
      return;
    }
    setLoading(true);
    const { data, error } = await supabaseClient
      .from('user_saved_trails')
      .select('trail_id')
      .eq('user_id', userId);
    setLoading(false);
    if (error) {
      console.warn('[saved trails]', error.message);
      setSavedIds(new Set());
      return;
    }
    setSavedIds(new Set((data ?? []).map((r: { trail_id: string }) => r.trail_id)));
  }, [supabaseClient, userId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const toggleSave = useCallback(
    async (trailId: string): Promise<{ saved: boolean; error?: string }> => {
      if (!supabaseClient || !userId) {
        return { saved: false, error: 'not_authenticated' };
      }
      const wasSaved = savedIds.has(trailId);
      if (wasSaved) {
        const { error } = await supabaseClient
          .from('user_saved_trails')
          .delete()
          .eq('user_id', userId)
          .eq('trail_id', trailId);
        if (error) return { saved: true, error: error.message };
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(trailId);
          return next;
        });
        return { saved: false };
      }
      const { error } = await supabaseClient.from('user_saved_trails').upsert(
        { user_id: userId, trail_id: trailId },
        { onConflict: 'user_id,trail_id' }
      );
      if (error) return { saved: false, error: error.message };
      setSavedIds((prev) => new Set(prev).add(trailId));
      return { saved: true };
    },
    [supabaseClient, userId, savedIds]
  );

  return { savedIds, loading, refresh, toggleSave };
}
