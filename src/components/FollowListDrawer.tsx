'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Loader2, User, X } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolvePublicDisplayName } from '@/lib/profileDisplay';

export type FollowListMode = 'followers' | 'following';

type FollowEdge = {
  follower_id?: string | null;
  following_id?: string | null;
  created_at?: string | null;
};

type FollowUser = {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  hide_display_name?: boolean | null;
  avatar_url?: string | null;
  is_verified?: boolean | null;
};

type FollowListDrawerProps = {
  open: boolean;
  mode: FollowListMode;
  userId: string;
  supabaseClient: SupabaseClient | null;
  onClose: () => void;
};

export function FollowListDrawer({
  open,
  mode,
  userId,
  supabaseClient,
  onClose,
}: FollowListDrawerProps) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = mode === 'followers' ? 'Followers' : 'Following';
  const emptyCopy = mode === 'followers'
    ? 'No followers yet.'
    : 'Not following anyone yet.';

  const queryParts = useMemo(() => {
    if (mode === 'followers') {
      return {
        matchColumn: 'following_id',
        personColumn: 'follower_id',
      };
    }
    return {
      matchColumn: 'follower_id',
      personColumn: 'following_id',
    };
  }, [mode]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open || !supabaseClient || !userId) {
      setUsers([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const { data: edges, error: edgeErr } = await supabaseClient
          .from('follows')
          .select('follower_id, following_id, created_at')
          .eq(queryParts.matchColumn, userId)
          .order('created_at', { ascending: false })
          .limit(200);

        if (edgeErr) throw edgeErr;
        if (cancelled) return;

        const ids = ((edges ?? []) as FollowEdge[])
          .map((edge) => edge[queryParts.personColumn as keyof FollowEdge])
          .filter((id): id is string => typeof id === 'string' && id.length > 0);

        if (ids.length === 0) {
          setUsers([]);
          return;
        }

        const { data: profiles, error: profileErr } = await supabaseClient
          .from('users')
          .select('id, name, username, email, hide_display_name, avatar_url, is_verified')
          .in('id', ids);

        if (profileErr) throw profileErr;
        if (cancelled) return;

        const order = new Map(ids.map((id, index) => [id, index]));
        const sorted = ((profiles ?? []) as FollowUser[])
          .filter((profile) => typeof profile.id === 'string')
          .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        setUsers(sorted);
      } catch {
        if (!cancelled) {
          setUsers([]);
          setError('Could not load this list.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, queryParts.matchColumn, queryParts.personColumn, supabaseClient, userId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9995] max-w-app-shell mx-auto" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 w-full bg-background/80 backdrop-blur-sm"
        aria-label="Close follow list"
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 max-h-[75dvh] bg-muted border border-border rounded-t-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-[16px] font-black text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-card text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={22} className="animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">{error}</p>
          ) : users.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">{emptyCopy}</p>
          ) : (
            <div className="space-y-2">
              {users.map((profile) => {
                const name = resolvePublicDisplayName(profile);
                const handle = profile.username ? `@${String(profile.username).toLowerCase()}` : null;
                return (
                  <Link
                    key={profile.id}
                    href={`/profile/${profile.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-xl bg-card border border-border px-3 py-3 hover:border-primary/45 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <User size={19} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-bold text-[14px] text-foreground truncate">{name}</p>
                        {profile.is_verified ? (
                          <BadgeCheck size={14} className="text-primary flex-shrink-0" />
                        ) : null}
                      </div>
                      {handle ? (
                        <p className="text-[12px] text-muted-foreground truncate">{handle}</p>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
