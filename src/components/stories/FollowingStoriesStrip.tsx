'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { StoryWatchModal, type WatchStoryRow, type StoryReelBucket } from '@/components/stories/StoryWatchModal';
import { resolvePublicDisplayName } from '@/lib/profileDisplay';
import { useToast } from '@/components/Toast';
import { isLimitedMediaDevice, resizeImageFileToJpegBlob } from '@/lib/media/mobileSafeCapture';

type ProfileLite = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  username: string | null;
  hide_display_name: boolean | null;
  email: string | null;
};

type BucketUser = StoryReelBucket;

function storyPreviewLabel(count: number) {
  return count === 1 ? '1 story' : `${count} stories`;
}

export function FollowingStoriesStrip({
  supabaseClient,
  user,
  embedded = false,
}: {
  supabaseClient: SupabaseClient | null;
  user: User | null;
  /** Hide section title (shown by parent tab bar). */
  embedded?: boolean;
}) {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [buckets, setBuckets] = useState<BucketUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [postingStory, setPostingStory] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);
  const [watchUserId, setWatchUserId] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    if (!supabaseClient || !user) {
      setBuckets([]);
      return;
    }
    setLoading(true);
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: followRows } = await supabaseClient
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = [...new Set((followRows ?? []).map((r: { following_id: string }) => r.following_id))];
      const interestIds = [...new Set([user.id, ...followingIds])];

      const { data: storyRows, error: sErr } = await supabaseClient
        .from('user_stories')
        .select('id, user_id, media_type, media_path, caption, created_at')
        .in('user_id', interestIds)
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      if (sErr) {
        setBuckets([]);
        return;
      }

      const rows = (storyRows ?? []) as WatchStoryRow[];
      const byUser = new Map<string, WatchStoryRow[]>();
      for (const r of rows) {
        const list = byUser.get(r.user_id) ?? [];
        list.push(r);
        byUser.set(r.user_id, list);
      }

      const userIdsWithStories = [...byUser.keys()];
      if (userIdsWithStories.length === 0) {
        setBuckets([]);
        return;
      }

      const { data: profiles } = await supabaseClient
        .from('users')
        .select('id, name, avatar_url, username, hide_display_name, email')
        .in('id', userIdsWithStories);

      const profileMap = new Map<string, ProfileLite>();
      for (const p of profiles ?? []) {
        profileMap.set(p.id as string, p as ProfileLite);
      }

      const built: BucketUser[] = userIdsWithStories.map((uid) => ({
        userId: uid,
        profile: profileMap.get(uid) ?? null,
        stories: byUser.get(uid) ?? [],
      }));

      built.sort((a, b) => {
        if (a.userId === user.id) return -1;
        if (b.userId === user.id) return 1;
        const ta = a.stories[a.stories.length - 1]?.created_at ?? '';
        const tb = b.stories[b.stories.length - 1]?.created_at ?? '';
        return tb.localeCompare(ta);
      });

      setBuckets(built);
    } finally {
      setLoading(false);
    }
  }, [supabaseClient, user]);

  useEffect(() => {
    void fetchStories();
  }, [fetchStories]);

  const ownBucket = useMemo(() => buckets.find((b) => b.userId === user?.id) ?? null, [buckets, user?.id]);

  const watchBucket = useMemo(
    () => buckets.find((b) => b.userId === watchUserId) ?? null,
    [buckets, watchUserId]
  );

  const othersBuckets = useMemo(() => buckets.filter((b) => b.userId !== user?.id), [buckets, user?.id]);

  const openWatch = (userId: string) => {
    setWatchUserId(userId);
    setWatchOpen(true);
  };

  const onPickStoryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !supabaseClient || !user) return;

    const mime = file.type || '';
    let mediaType: 'image' | 'video' | null = null;
    if (mime.startsWith('image/')) mediaType = 'image';
    else if (mime.startsWith('video/')) mediaType = 'video';
    if (!mediaType) {
      showToast('Choose a photo or video.', 'info');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      showToast('File is too large (max 50 MB).', 'error');
      return;
    }

    let path = '';
    let uploadBody: Blob | File = file;
    let uploadMime = mime || file.type;

    if (mediaType === 'image') {
      const maxEdge = isLimitedMediaDevice() ? 1400 : 2200;
      try {
        uploadBody = await resizeImageFileToJpegBlob(file, maxEdge, 0.88);
        uploadMime = 'image/jpeg';
        path = `${user.id}/${crypto.randomUUID()}.jpg`;
      } catch {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 8);
        path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        uploadBody = file;
        uploadMime = mime || file.type;
      }
    } else {
      const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().slice(0, 8);
      path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      uploadBody = file;
      uploadMime = mime || file.type;
    }

    setPostingStory(true);
    try {
      const { error: upErr } = await supabaseClient.storage.from('story-media').upload(path, uploadBody, {
        contentType: uploadMime || undefined,
        upsert: false,
      });
      if (upErr) throw upErr;

      const { error: insErr } = await supabaseClient.from('user_stories').insert({
        user_id: user.id,
        media_type: mediaType,
        media_path: path,
        caption: null,
      });
      if (insErr) throw insErr;

      showToast('Story posted — visible to followers for 24 hours.', 'success');
      await fetchStories();
    } catch {
      showToast('Could not post story.', 'error');
    } finally {
      setPostingStory(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(ev) => void onPickStoryFile(ev)}
      />

      <div className={`px-4 ${embedded ? 'pt-2 pb-2' : 'pt-3 pb-2'}`}>
        {!embedded && (
          <div className="flex items-center justify-between mb-2 px-0.5">
            <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Stories</p>
            {loading && <Loader2 size={14} className="animate-spin text-zinc-600" />}
          </div>
        )}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 [overscroll-behavior-x:contain] touch-pan-x">
          <button
            type="button"
            disabled={postingStory}
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 select-none disabled:opacity-50"
          >
            <div className="relative w-[58px] h-[58px] rounded-full p-[2px] bg-gradient-to-br from-orange-400 to-orange-700">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden border-2 border-black">
                {postingStory ? (
                  <Loader2 size={20} className="animate-spin text-orange-400" />
                ) : (
                  <Plus size={22} className="text-orange-400" strokeWidth={2.5} />
                )}
              </div>
            </div>
            <span className="text-[9px] text-zinc-500 font-medium max-w-[76px] truncate">Add story</span>
          </button>

          {ownBucket && (
            <button
              type="button"
              onClick={() => openWatch(user.id)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 select-none"
            >
              <motion.div whileTap={{ scale: 0.91 }} className="relative">
                <div className="relative w-[58px] h-[58px] rounded-full p-[2px] bg-gradient-to-br from-orange-400 to-orange-600">
                  <div className="w-full h-full rounded-full overflow-hidden bg-zinc-950">
                    <img
                      src={
                        ownBucket.profile?.avatar_url ??
                        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=120&q=80'
                      }
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              </motion.div>
              <span className="text-[9px] text-zinc-500 text-center font-medium max-w-[76px] truncate">Your story</span>
              <span className="text-[8px] text-zinc-600 -mt-1">{storyPreviewLabel(ownBucket.stories.length)}</span>
            </button>
          )}

          {othersBuckets.map((b) => {
            const dn = b.profile
              ? resolvePublicDisplayName({
                  id: b.userId,
                  name: b.profile.name,
                  username: b.profile.username,
                  hide_display_name: b.profile.hide_display_name,
                  email: b.profile.email,
                })
              : 'Rider';
            const src =
              b.profile?.avatar_url ??
              'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=120&q=80';
            return (
              <button
                key={b.userId}
                type="button"
                onClick={() => openWatch(b.userId)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 select-none"
              >
                <motion.div whileTap={{ scale: 0.91 }} className="relative">
                  <div className="relative w-[58px] h-[58px] rounded-full p-[2px] bg-gradient-to-br from-orange-400 to-orange-600">
                    <div className="w-full h-full rounded-full overflow-hidden bg-zinc-950">
                      <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  </div>
                </motion.div>
                <span className="text-[9px] text-zinc-500 text-center font-medium leading-tight max-w-[76px] w-[76px] line-clamp-2">
                  {dn}
                </span>
                <span className="text-[8px] text-zinc-600 -mt-1">{storyPreviewLabel(b.stories.length)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <StoryWatchModal
        open={watchOpen && buckets.length > 0}
        onClose={() => {
          setWatchOpen(false);
          setWatchUserId(null);
        }}
        supabaseClient={supabaseClient}
        reels={buckets}
        initialReelIndex={Math.max(
          0,
          watchUserId ? buckets.findIndex((b) => b.userId === watchUserId) : 0
        )}
        viewerUserId={user.id}
        onStoriesChanged={fetchStories}
      />
    </>
  );
}
