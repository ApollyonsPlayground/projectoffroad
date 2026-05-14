'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolvePublicDisplayName } from '@/lib/profileDisplay';
import { useToast } from '@/components/Toast';

export type WatchStoryRow = {
  id: string;
  user_id: string;
  media_type: string;
  media_path: string;
  caption: string | null;
  created_at: string;
};

/** One account’s story stack (Instagram-style reel). */
export type StoryReelBucket = {
  userId: string;
  profile: {
    id: string;
    name: string | null;
    avatar_url: string | null;
    username: string | null;
    hide_display_name: boolean | null;
    email: string | null;
  } | null;
  stories: WatchStoryRow[];
};

const IMAGE_MS = 5200;
const SWIPE_X_PX = 56;

type Props = {
  open: boolean;
  onClose: () => void;
  supabaseClient: SupabaseClient | null;
  reels: StoryReelBucket[];
  initialReelIndex: number;
  /** Signed-in user — when it matches the active reel’s `userId`, they can delete their story. */
  viewerUserId?: string | null;
  /** Called after a successful delete so the strip can refetch (and drop empty buckets). */
  onStoriesChanged?: () => void | Promise<void>;
};

export function StoryWatchModal({
  open,
  onClose,
  supabaseClient,
  reels,
  initialReelIndex,
  viewerUserId = null,
  onStoriesChanged,
}: Props) {
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [reelIdx, setReelIdx] = useState(0);
  const [storyIdx, setStoryIdx] = useState(0);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 0–1 fill for the active progress segment (images advance by timer; videos use timeupdate). */
  const [segmentProgress, setSegmentProgress] = useState(0);
  const [videoMuted, setVideoMuted] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageTimerRef = useRef<number | null>(null);
  const imageStartRef = useRef<number>(0);
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const suppressTapRef = useRef(false);
  const stateRef = useRef({ reelIdx: 0, storyIdx: 0 });

  const y = useMotionValue(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  /** Full-screen overlay must attach to `document.body` — ancestors with transform (Framer, sticky strips)
   *  turn `position:fixed` into a positioned descendant, so stories render behind the nav/header otherwise. */
  useEffect(() => {
    if (!open || !mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, mounted]);

  useEffect(() => {
    stateRef.current = { reelIdx, storyIdx };
  }, [reelIdx, storyIdx]);

  useEffect(() => {
    if (!open) {
      setReelIdx(Math.min(Math.max(0, initialReelIndex), Math.max(0, reels.length - 1)));
      setStoryIdx(0);
      setSignedUrl(null);
      setError(null);
      setSegmentProgress(0);
      setVideoMuted(true);
      y.set(0);
      return;
    }
    const ri = Math.min(Math.max(0, initialReelIndex), Math.max(0, reels.length - 1));
    setReelIdx(ri);
    setStoryIdx(0);
    setSegmentProgress(0);
    y.set(0);
  }, [open, initialReelIndex, reels.length, y]);

  const currentReel = reels[reelIdx];
  const bucketStories = currentReel?.stories ?? [];
  const safeStoryIdx = Math.min(Math.max(0, storyIdx), Math.max(0, bucketStories.length - 1));
  const current = bucketStories[safeStoryIdx] ?? null;

  const isOwnStory =
    Boolean(viewerUserId && currentReel?.userId && viewerUserId === currentReel.userId);

  /** After parent refetches, current reel may be gone or empty — hop reels or close. */
  useEffect(() => {
    if (!open || reels.length === 0) {
      if (open && reels.length === 0) onClose();
      return;
    }
    const bucket = reels[reelIdx];
    if (bucket && bucket.stories.length > 0) return;

    const forward = reels.findIndex((b, i) => i >= reelIdx && b.stories.length > 0);
    if (forward >= 0) {
      setReelIdx(forward);
      setStoryIdx(0);
      return;
    }
    let backward = -1;
    for (let i = reelIdx - 1; i >= 0; i--) {
      if (reels[i].stories.length > 0) {
        backward = i;
        break;
      }
    }
    if (backward >= 0) {
      setReelIdx(backward);
      setStoryIdx(Math.max(0, reels[backward].stories.length - 1));
      return;
    }
    onClose();
  }, [open, reels, reelIdx, onClose]);

  const displayName = currentReel?.profile
    ? resolvePublicDisplayName({
        id: currentReel.userId,
        name: currentReel.profile.name,
        username: currentReel.profile.username,
        hide_display_name: currentReel.profile.hide_display_name,
        email: currentReel.profile.email,
      })
    : 'Rider';

  const avatarUrl = currentReel?.profile?.avatar_url ?? null;

  const clearImageTimer = useCallback(() => {
    if (imageTimerRef.current != null) {
      cancelAnimationFrame(imageTimerRef.current);
      imageTimerRef.current = null;
    }
  }, []);

  const deleteCurrentStory = useCallback(async () => {
    if (!supabaseClient || !current || !isOwnStory || deleting) return;
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Delete this story? It will be removed for everyone.')
    ) {
      return;
    }
    setDeleting(true);
    clearImageTimer();
    try {
      const { error: rowErr } = await supabaseClient.from('user_stories').delete().eq('id', current.id);
      if (rowErr) throw rowErr;

      const { error: stErr } = await supabaseClient.storage.from('story-media').remove([current.media_path]);
      if (stErr) {
        console.warn('[StoryWatchModal] storage remove:', stErr.message);
      }

      showToast('Story deleted', 'success');
      await onStoriesChanged?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not delete story';
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  }, [
    supabaseClient,
    current,
    isOwnStory,
    deleting,
    clearImageTimer,
    showToast,
    onStoriesChanged,
  ]);

  const goNextStory = useCallback(() => {
    clearImageTimer();
    setSegmentProgress(0);
    const { reelIdx: ri, storyIdx: si } = stateRef.current;
    const list = reels[ri]?.stories ?? [];
    if (si < list.length - 1) {
      setStoryIdx(si + 1);
      return;
    }
    if (ri < reels.length - 1) {
      setReelIdx(ri + 1);
      setStoryIdx(0);
      return;
    }
    onClose();
  }, [clearImageTimer, onClose, reels]);

  const goPrevStory = useCallback(() => {
    clearImageTimer();
    setSegmentProgress(0);
    const { reelIdx: ri, storyIdx: si } = stateRef.current;
    if (si > 0) {
      setStoryIdx(si - 1);
      return;
    }
    if (ri > 0) {
      const prevList = reels[ri - 1]?.stories ?? [];
      setReelIdx(ri - 1);
      setStoryIdx(Math.max(0, prevList.length - 1));
    }
  }, [clearImageTimer, reels]);

  /** Horizontal swipe — next / previous account’s reel (first / last story). */
  const goNextReel = useCallback(() => {
    clearImageTimer();
    setSegmentProgress(0);
    const { reelIdx: ri } = stateRef.current;
    if (ri < reels.length - 1) {
      setReelIdx(ri + 1);
      setStoryIdx(0);
      return;
    }
    onClose();
  }, [clearImageTimer, onClose, reels.length]);

  const goPrevReel = useCallback(() => {
    clearImageTimer();
    setSegmentProgress(0);
    const { reelIdx: ri } = stateRef.current;
    if (ri <= 0) return;
    const prevList = reels[ri - 1]?.stories ?? [];
    setReelIdx(ri - 1);
    setStoryIdx(Math.max(0, prevList.length - 1));
  }, [clearImageTimer, reels]);

  const loadUrl = useCallback(async () => {
    if (!open || !supabaseClient || !current) {
      setSignedUrl(null);
      return;
    }
    setError(null);
    const { data, error: signErr } = await supabaseClient.storage
      .from('story-media')
      .createSignedUrl(current.media_path, 60 * 60 * 24);
    if (signErr || !data?.signedUrl) {
      setError('Could not load media');
      setSignedUrl(null);
      return;
    }
    setSignedUrl(data.signedUrl);
  }, [open, supabaseClient, current]);

  useEffect(() => {
    void loadUrl();
  }, [loadUrl]);

  /* Image segment timer — Instagram-style auto-advance */
  useEffect(() => {
    clearImageTimer();
    if (!open || !current || current.media_type !== 'image') {
      setSegmentProgress(0);
      return;
    }
    imageStartRef.current = performance.now();
    const tick = () => {
      const elapsed = performance.now() - imageStartRef.current;
      const p = Math.min(1, elapsed / IMAGE_MS);
      setSegmentProgress(p);
      if (p >= 1) {
        imageTimerRef.current = null;
        goNextStory();
        return;
      }
      imageTimerRef.current = requestAnimationFrame(tick);
    };
    imageTimerRef.current = requestAnimationFrame(tick);
    return clearImageTimer;
  }, [open, current?.id, current?.media_type, clearImageTimer, goNextStory]);

  /* Sync story index if reel bucket shrinks */
  useEffect(() => {
    if (!bucketStories.length) return;
    if (storyIdx > bucketStories.length - 1) {
      setStoryIdx(bucketStories.length - 1);
    }
  }, [bucketStories.length, storyIdx]);

  const onVideoTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setSegmentProgress(v.currentTime / v.duration);
  };

  const onVideoEnded = () => {
    setSegmentProgress(1);
    goNextStory();
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !signedUrl) return;
    v.currentTime = 0;
    setSegmentProgress(0);
    void v.play().catch(() => {});
  }, [current?.id, signedUrl]);

  const handleDragEndY = (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    const dismiss = info.offset.y > 110 || info.velocity.y > 650;
    if (dismiss) {
      void animate(y, typeof window !== 'undefined' ? window.innerHeight : 800, {
        type: 'tween',
        duration: 0.22,
        ease: [0.32, 0.72, 0, 1],
      }).then(onClose);
      return;
    }
    void animate(y, 0, { type: 'spring', stiffness: 420, damping: 38 });
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const duration = Date.now() - start.t;
    if (Math.abs(dx) > SWIPE_X_PX && Math.abs(dx) > Math.abs(dy)) {
      suppressTapRef.current = true;
      window.setTimeout(() => {
        suppressTapRef.current = false;
      }, 320);
      if (dx < 0) goNextReel();
      else goPrevReel();
      return;
    }
    /* Short vertical swipe → dismiss */
    if (dy > 90 && Math.abs(dx) < 40 && duration < 600) {
      onClose();
    }
  };

  const tapLeft = () => {
    if (suppressTapRef.current) return;
    goPrevStory();
  };
  const tapRight = () => {
    if (suppressTapRef.current) return;
    goNextStory();
  };

  if (!open || reels.length === 0 || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="story-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[19900] isolate min-h-[100dvh] w-full bg-background overflow-hidden"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <motion.div
            className="absolute inset-0 flex flex-col bg-background touch-pan-y"
            style={{ y, touchAction: 'pan-y' }}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 280 }}
            dragElastic={{ top: 0, bottom: 0.45 }}
            onDragEnd={handleDragEndY}
          >
            {/* Top gradient + progress + header (Instagram-style) */}
            <div
              className="absolute top-0 left-0 right-0 z-30 pt-[calc(env(safe-area-inset-top)+8px)] pb-6 px-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none"
            >
              <div className="flex gap-1 mb-2 pointer-events-none">
                {bucketStories.map((s, i) => {
                  let fill = 0;
                  if (i < safeStoryIdx) fill = 1;
                  else if (i === safeStoryIdx) fill = segmentProgress;
                  return (
                    <div key={s.id} className="flex-1 h-[3px] rounded-full bg-white/25 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                        style={{ width: `${fill * 100}%`, transition: i === safeStoryIdx ? 'none' : 'width 0.12s ease-out' }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-background/35 text-foreground/90 backdrop-blur-sm active:scale-95"
                  aria-label="Close"
                >
                  <X size={20} strokeWidth={2.4} />
                </button>
                <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden border border-white/15 flex-shrink-0 ring-2 ring-primary/40">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-muted-foreground">
                      {(displayName || '?')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-foreground truncate leading-tight">{displayName}</p>
                  <p className="text-[11px] text-foreground/55 mt-0.5 leading-tight">
                    {current
                      ? `${formatStoryMeta(current.created_at)} · Trail stories`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  {isOwnStory && (
                    <button
                      type="button"
                      onClick={() => void deleteCurrentStory()}
                      disabled={deleting}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-background/35 text-red-400 backdrop-blur-sm disabled:opacity-50 active:scale-95"
                      aria-label="Delete story"
                    >
                      <Trash2 size={18} strokeWidth={2.2} />
                    </button>
                  )}
                  {current?.media_type === 'video' && signedUrl && (
                    <button
                      type="button"
                      onClick={() => setVideoMuted((m) => !m)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-background/35 text-foreground backdrop-blur-sm"
                      aria-label={videoMuted ? 'Unmute' : 'Mute'}
                    >
                      {videoMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Full-bleed media */}
            <div
              className="flex-1 relative flex items-center justify-center bg-background min-h-0"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {/* Tap zones (~Instagram thirds): prev / next story */}
              <button
                type="button"
                aria-label="Previous"
                className="absolute left-0 top-0 bottom-0 w-[38%] max-w-[180px] z-20 cursor-w-resize bg-transparent"
                onClick={tapLeft}
              />
              <button
                type="button"
                aria-label="Next"
                className="absolute right-0 top-0 bottom-0 w-[38%] max-w-[180px] z-20 cursor-e-resize bg-transparent"
                onClick={tapRight}
              />

              {error && (
                <p className="text-red-400 text-[14px] px-6 text-center z-10">{error}</p>
              )}
              {!error && signedUrl && current?.media_type === 'image' && (
                <img
                  src={signedUrl}
                  alt=""
                  className="w-full h-full object-cover select-none md:object-contain"
                  draggable={false}
                />
              )}
              {!error && signedUrl && current?.media_type === 'video' && (
                <video
                  ref={videoRef}
                  key={current.id}
                  src={signedUrl}
                  playsInline
                  muted={videoMuted}
                  className="w-full h-full object-cover md:object-contain bg-background"
                  onTimeUpdate={onVideoTimeUpdate}
                  onEnded={onVideoEnded}
                />
              )}
              {!error && !signedUrl && current && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Subtle brand cue */}
              <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+12px)] left-3 z-10 pointer-events-none">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-foreground/35">
                  SoCal<span className="text-primary/90/80">Offroaders</span>
                </p>
              </div>
            </div>

            {/* Caption overlay */}
            {current?.caption?.trim() && (
              <div className="absolute bottom-0 left-0 right-0 z-[22] px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-16 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none">
                <p className="text-[15px] text-foreground font-medium leading-snug drop-shadow-lg shadow-black/80">
                  {current.caption}
                </p>
              </div>
            )}

            {/* Hint pill — fades familiarity */}
            <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+56px)] left-1/2 -translate-x-1/2 z-20 pointer-events-none md:hidden">
              <p className="text-[10px] text-foreground/35 font-medium px-3 py-1 rounded-full bg-background/25 backdrop-blur-sm whitespace-nowrap">
                Tap sides · swipe ← → people · swipe down to close
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function formatStoryMeta(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
