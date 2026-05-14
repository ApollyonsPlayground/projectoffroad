'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Grid3X3, Bookmark, Heart, Repeat2, BadgeCheck, Loader2, MessageCircle, Ban, UserPlus, UserMinus, type LucideIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';
import { useToast } from '@/components/Toast';
import { resolveOwnProfileDisplayName, resolvePublicDisplayName } from '@/lib/profileDisplay';
import {
  fetchLikedPostIdsRecent,
  fetchPostsByIds,
  fetchSavedPostIdsRecent,
} from '@/lib/supabase/resilientSocial';
import { ensureStoragePublicObjectUrl } from '@/lib/supabase/storagePublicUrl';

type Tab = 'posts' | 'reposts' | 'liked' | 'favorites';

/** Minimal public user row from `users` select — fields used by this page. */
type ViewedUserProfile = {
  id?: string;
  name?: string | null;
  username?: string | null;
  hide_display_name?: boolean | null;
  email?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  is_verified?: boolean | null;
  bio?: string | null;
  dm_allow_from?: string | null;
};

interface PostRow {
  id: string;
  image_url?: string;
  body?: string;
  created_at: string;
  repost_of_id?: string | null;
}

function normalizePostRow(p: Record<string, unknown>): PostRow {
  const raw = (p.image_url as string) ?? undefined;
  return {
    id: String(p.id),
    image_url: raw
      ? ensureStoragePublicObjectUrl(raw) || raw
      : undefined,
    body: String(p.body ?? p.content ?? p.caption ?? ''),
    created_at: String(p.created_at ?? ''),
    repost_of_id: (p.repost_of_id as string | null | undefined) ?? null,
  };
}

function PostGrid({ posts }: { posts: PostRow[] }) {
  if (posts.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {posts.map((p) => (
        <Link
          key={p.id}
          href={`/posts/${p.id}`}
          className="aspect-square bg-card overflow-hidden relative block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {p.image_url ? (
            <img src={p.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-2">
              <p className="text-muted-foreground text-[10px] text-center leading-tight line-clamp-4">{p.body}</p>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params?.userId as string;
  const { supabaseClient, user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [messagingLoading, setMessagingLoading] = useState(false);

  const [profile, setProfile] = useState<ViewedUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [myPosts, setMyPosts] = useState<PostRow[]>([]);
  const [reposts, setReposts] = useState<PostRow[]>([]);
  const [liked, setLiked] = useState<PostRow[]>([]);
  const [favorites, setFavorites] = useState<PostRow[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const [postsCount, setPostsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  /** none | i_blocked | they_blocked */
  const [blockRelation, setBlockRelation] = useState<'none' | 'i_blocked' | 'they_blocked'>('none');
  const [followBusy, setFollowBusy] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);

  // Fetch profile
  useEffect(() => {
    if (!userId) { setError('Invalid user ID'); setIsLoading(false); return; }
    if (!supabaseClient) { setError('Not connected'); setIsLoading(false); return; }
    supabaseClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) setError('User not found');
        else setProfile(data);
        setIsLoading(false);
      });
  }, [userId, supabaseClient]);

  useEffect(() => {
    if (!supabaseClient || !userId || isLoading || error) return;
    let cancelled = false;
    void (async () => {
      try {
        const [postsRes, folRes, ingRes] = await Promise.all([
          supabaseClient
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('repost_of_id', null),
          supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
          supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        ]);
        if (cancelled) return;
        setPostsCount(postsRes.count ?? 0);
        setFollowersCount(folRes.count ?? 0);
        setFollowingCount(ingRes.count ?? 0);
      } catch {
        if (!cancelled) {
          setPostsCount(0);
          setFollowersCount(0);
          setFollowingCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseClient, userId, isLoading, error]);

  useEffect(() => {
    if (!supabaseClient || !user || !userId || user.id === userId) {
      setIsFollowing(false);
      setBlockRelation('none');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data: row } = await supabaseClient
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();
        if (cancelled) return;
        setIsFollowing(!!row);

        const [a, b] = await Promise.all([
          supabaseClient.from('user_blocks').select('id').eq('blocker_id', user.id).eq('blocked_id', userId).maybeSingle(),
          supabaseClient.from('user_blocks').select('id').eq('blocker_id', userId).eq('blocked_id', user.id).maybeSingle(),
        ]);
        if (cancelled) return;
        const ib = !!a.data;
        const tb = !!b.data;
        if (ib) setBlockRelation('i_blocked');
        else if (tb) setBlockRelation('they_blocked');
        else setBlockRelation('none');
      } catch {
        if (!cancelled) {
          setIsFollowing(false);
          setBlockRelation('none');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseClient, user, userId]);

  const toggleFollow = useCallback(async () => {
    if (!user || !supabaseClient || user.id === userId || blockRelation !== 'none') return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        const { error: delErr } = await supabaseClient
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        if (delErr) throw delErr;
        setIsFollowing(false);
        setFollowersCount((c) => Math.max(0, c - 1));
      } else {
        const { error: insErr } = await supabaseClient
          .from('follows')
          .insert({ follower_id: user.id, following_id: userId });
        if (insErr) throw insErr;
        setIsFollowing(true);
        setFollowersCount((c) => c + 1);
      }
    } catch {
      showToast('Could not update follow', 'error');
    } finally {
      setFollowBusy(false);
    }
  }, [user, supabaseClient, userId, isFollowing, blockRelation, showToast]);

  const toggleBlock = useCallback(async () => {
    if (!user || !supabaseClient || user.id === userId) return;
    setBlockBusy(true);
    try {
      if (blockRelation === 'i_blocked') {
        const { error: delErr } = await supabaseClient
          .from('user_blocks')
          .delete()
          .eq('blocker_id', user.id)
          .eq('blocked_id', userId);
        if (delErr) throw delErr;
        const { data: tbRow } = await supabaseClient
          .from('user_blocks')
          .select('id')
          .eq('blocker_id', userId)
          .eq('blocked_id', user.id)
          .maybeSingle();
        setBlockRelation(tbRow ? 'they_blocked' : 'none');
        showToast('Unblocked', 'success');
      } else {
        const { error: insErr } = await supabaseClient
          .from('user_blocks')
          .insert({ blocker_id: user.id, blocked_id: userId });
        if (insErr) throw insErr;
        if (isFollowing) setFollowersCount((c) => Math.max(0, c - 1));
        setIsFollowing(false);
        setBlockRelation('i_blocked');
        showToast('Blocked', 'success');
      }
    } catch {
      showToast('Could not update block', 'error');
    } finally {
      setBlockBusy(false);
    }
  }, [user, supabaseClient, userId, blockRelation, isFollowing, showToast]);

  const fetchTab = useCallback(async (tab: Tab) => {
    if (!supabaseClient || !userId) return;
    setTabLoading(true);
    try {
      if (tab === 'posts') {
        const { data, error } = await supabaseClient
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(60);
        if (error) setMyPosts([]);
        else {
          const rows = ((data ?? []) as Record<string, unknown>[]).filter((p) => !p.repost_of_id).slice(0, 30);
          setMyPosts(rows.map(normalizePostRow));
        }
      } else if (tab === 'reposts') {
        const { data, error } = await supabaseClient
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(60);
        if (error) setReposts([]);
        else {
          const rows = ((data ?? []) as Record<string, unknown>[]).filter((p) => !!p.repost_of_id).slice(0, 30);
          setReposts(rows.map(normalizePostRow));
        }
      } else if (tab === 'liked') {
        const ids = await fetchLikedPostIdsRecent(supabaseClient, userId, 30);
        const posts = await fetchPostsByIds(supabaseClient, ids);
        const order = new Map(ids.map((id, i) => [id, i]));
        posts.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        setLiked(posts.map((p) => normalizePostRow(p as Record<string, unknown>)));
      } else if (tab === 'favorites') {
        const ids = await fetchSavedPostIdsRecent(supabaseClient, userId, 30);
        const posts = await fetchPostsByIds(supabaseClient, ids);
        const order = new Map(ids.map((id, i) => [id, i]));
        posts.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        setFavorites(posts.map((p) => normalizePostRow(p as Record<string, unknown>)));
      }
    } finally {
      setTabLoading(false);
    }
  }, [supabaseClient, userId]);

  const handleMessage = useCallback(async () => {
    if (!user || !supabaseClient || !userId) return;
    if (profile?.dm_allow_from === 'nobody') {
      showToast('This user is not accepting messages.', 'info');
      return;
    }
    if (blockRelation !== 'none') {
      showToast('Messaging is unavailable between these accounts.', 'info');
      return;
    }
    setMessagingLoading(true);
    try {
      // Find existing conversation between these two users
      const { data: myParticipations } = await supabaseClient
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      const myConvIds = (myParticipations ?? []).map((r) => String((r as { conversation_id: string }).conversation_id));

      let existingConvId: string | null = null;

      if (myConvIds.length > 0) {
        const { data: otherParticipations } = await supabaseClient
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', userId)
          .in('conversation_id', myConvIds);

        existingConvId = otherParticipations?.[0]?.conversation_id ?? null;
      }

      if (existingConvId) {
        router.push(`/messages/${existingConvId}/`);
        return;
      }

      // Create a new conversation (created_by required for RLS + RETURNING before participants exist)
      const { data: newConv, error: convErr } = await supabaseClient
        .from('conversations')
        .insert({
          created_by: user.id,
          last_message_content: null,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (convErr || !newConv) throw convErr ?? new Error('Failed to create conversation');

      // Two inserts so RLS can see the first row before adding the other user
      const { error: p1 } = await supabaseClient.from('conversation_participants').insert({
        conversation_id: newConv.id,
        user_id: user.id,
        is_read: true,
      });
      if (p1) throw p1;
      const { error: p2 } = await supabaseClient.from('conversation_participants').insert({
        conversation_id: newConv.id,
        user_id: userId,
        is_read: true,
      });
      if (p2) throw p2;

      router.push(`/messages/${newConv.id}/`);
    } catch {
      showToast('Could not open messages. If this keeps happening, ask an admin to apply DB migrations.', 'error');
    } finally {
      setMessagingLoading(false);
    }
  }, [user, supabaseClient, userId, router, profile, blockRelation, showToast]);

  useEffect(() => {
    if (!isLoading && !error) fetchTab(activeTab);
  }, [activeTab, isLoading, error, fetchTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <BottomNav />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-6">
        <h2 className="text-[22px] font-black text-foreground">Profile Not Found</h2>
        <p className="text-muted-foreground text-[14px]">{error ?? 'This user does not exist.'}</p>
        <Link href="/feed/" className="px-5 py-3 bg-primary text-primary-foreground font-bold rounded-xl text-[14px]">
          Back to Feed
        </Link>
        <BottomNav />
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'posts',     label: 'Posts',     icon: Grid3X3 },
    { id: 'reposts',   label: 'Reposts',   icon: Repeat2 },
    { id: 'liked',     label: 'Liked',     icon: Heart },
    { id: 'favorites', label: 'Favorites', icon: Bookmark },
  ];

  const dataMap: Record<Tab, PostRow[]> = { posts: myPosts, reposts, liked, favorites };
  const currentData = dataMap[activeTab];

  const emptyMessages: Record<Tab, string> = {
    posts:     'No posts yet.',
    reposts:   'No reposts yet.',
    liked:     'No liked posts yet.',
    favorites: 'No saved posts yet.',
  };

  const viewerSelf = Boolean(user && userId && user.id === userId);
  const memberDisplayName = viewerSelf
    ? resolveOwnProfileDisplayName({
        id: userId,
        name: profile?.name as string | undefined,
        username: profile?.username as string | undefined,
        hide_display_name: profile?.hide_display_name as boolean | undefined,
        email: user?.email ?? (profile?.email as string | undefined) ?? null,
      })
    : resolvePublicDisplayName({
        id: userId,
        name: profile?.name as string | undefined,
        username: profile?.username as string | undefined,
        hide_display_name: profile?.hide_display_name as boolean | undefined,
        email: profile?.email as string | undefined,
      });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/feed/" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-card transition-colors">
          <ArrowLeft size={19} className="text-foreground" />
        </Link>
        <span className="text-[17px] font-black text-foreground leading-none">{memberDisplayName}</span>
      </div>

      {/* Profile header */}
      <div className="max-w-app-shell mx-auto px-4 pt-6 pb-4 flex flex-col items-center text-center gap-3">
        <div className="relative">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-800 border-2 border-border">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={memberDisplayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground font-black text-2xl">
                {(memberDisplayName ?? 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
          {profile.role === 'owner' && (
            <span className="absolute -bottom-1 -right-1 w-[22px] h-[22px] rounded-full bg-[#FF8C00] flex items-center justify-center">
              <span className="text-[8px] font-black text-primary-foreground leading-none">SO</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <h1 className="text-[20px] font-black text-foreground leading-none">{memberDisplayName}</h1>
          {profile.is_verified && <BadgeCheck size={17} className="text-primary flex-shrink-0" />}
        </div>

        {profile.bio && (
          <p className="text-muted-foreground text-[13px] leading-relaxed max-w-[260px]">{profile.bio}</p>
        )}

        <div className="flex justify-around w-full max-w-xs mx-auto mt-4 pt-4 border-t border-border">
          {[
            { label: 'Posts', value: postsCount },
            { label: 'Followers', value: followersCount },
            { label: 'Following', value: followingCount },
          ].map(({ label, value }) => (
            <div key={label} className="text-center min-w-[72px]">
              <p className="text-[17px] font-black text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>

        {/* Actions — other user's profile */}
        {user && user.id !== userId && (
          <div className="flex flex-col gap-2 w-full max-w-xs mt-4">
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => void toggleFollow()}
                disabled={followBusy || blockRelation !== 'none'}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-card border border-border text-foreground text-[13px] font-bold disabled:opacity-40"
              >
                {followBusy ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : isFollowing ? (
                  <>
                    <UserMinus size={15} /> Following
                  </>
                ) : (
                  <>
                    <UserPlus size={15} /> Follow
                  </>
                )}
              </button>
              {profile?.dm_allow_from !== 'nobody' && blockRelation === 'none' && (
                <button
                  type="button"
                  onClick={() => void handleMessage()}
                  disabled={messagingLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:opacity-90 disabled:bg-zinc-800 disabled:text-muted-foreground text-primary-foreground text-[13px] font-black rounded-xl transition-colors"
                >
                  {messagingLoading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <MessageCircle size={15} strokeWidth={2.5} />
                  )}
                  {messagingLoading ? '…' : 'Message'}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => void toggleBlock()}
              disabled={blockBusy || blockRelation === 'they_blocked'}
              className="flex items-center justify-center gap-2 py-2 text-[12px] font-semibold text-muted-foreground hover:text-red-400 disabled:opacity-40"
            >
              {blockBusy ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
              {blockRelation === 'i_blocked' ? 'Unblock' : blockRelation === 'they_blocked' ? 'You are blocked' : 'Block'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="max-w-app-shell mx-auto border-b border-border">
        <div className="flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1 py-3 text-[12px] font-semibold transition-colors border-b-2 ${
                activeTab === id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-muted-foreground'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-app-shell mx-auto pt-1">
        {tabLoading ? (
          <div className="flex justify-center pt-10">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        ) : currentData.length === 0 ? (
          <div className="text-center pt-12">
            <p className="text-muted-foreground text-[14px]">{emptyMessages[activeTab]}</p>
          </div>
        ) : (
          <PostGrid posts={currentData} />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
