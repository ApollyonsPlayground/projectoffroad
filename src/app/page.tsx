'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  MoreHorizontal,
  BadgeCheck,
  Radio,
  Mountain,
  Plus,
  ZoomIn,
  X,
  Image as ImageIcon,
  ChevronDown,
  Send,
  Flag,
  Bookmark,
  Loader2,
  Trash2,
  CornerDownRight,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { FeedSkeleton } from '@/components/SkeletonLoader';
import DisclaimerModal from '@/components/DisclaimerModal';

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// ─── NewPostDrawer ─────────────────────────────────────────────────────────────

function NewPostDrawer({ open, onClose, onPosted }: {
  open: boolean;
  onClose: () => void;
  onPosted?: () => void;
}) {
  const { user, isConfigured, supabaseClient, profile } = useAuth();
  const userRole = (profile?.role as string) ?? 'user';
  const userAvatarUrl = (profile?.avatar_url as string) ?? (user?.user_metadata?.avatar_url as string) ?? null;
  const { showToast } = useToast();
  const [body, setBody] = useState('');
  const [rig, setRig] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'inserting'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => textareaRef.current?.focus(), 300);
    } else {
      document.body.style.overflow = '';
      // Reset on close
      setBody('');
      setRig('');
      setImageFile(null);
      setImagePreview(null);
      setUploadProgress('idle');
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image must be under 10 MB', 'error');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!body.trim() || isSubmitting) return;

    if (!isConfigured || !user) {
      showToast('Sign in to post to the community', 'info');
      return;
    }

    setIsSubmitting(true);
    let imageUrl: string | null = null;

    try {
      // Step 1: upload image if present
      if (imageFile && supabaseClient) {
        setUploadProgress('uploading');
        const ext = imageFile.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabaseClient.storage
          .from('post-images')
          .upload(path, imageFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabaseClient.storage.from('post-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      // Step 2: NSFW pre-flight check via Edge Function (only if image was uploaded)
      if (imageUrl && supabaseClient) {
        try {
          const { data: fnData, error: fnError } = await supabaseClient.functions.invoke(
            'moderate-image',
            { body: { mode: 'preflight', image_url: imageUrl } }
          );
          if (!fnError && fnData?.allowed === false) {
            showToast('Image flagged as inappropriate and cannot be posted.', 'error');
            setIsSubmitting(false);
            return;
          }
        } catch {
          // Edge Function unavailable — allow the upload to proceed (fail open)
          console.log('[v0] moderate-image edge function unavailable; proceeding');
        }
      }

      // Step 3: use user metadata directly (no DB lookup needed)
      const userName = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'Rider';

      // Step 4: insert post row — using supabaseClient from AuthContext (has auth session)
      const { error: insertError } = await supabaseClient!
        .from('posts')
        .insert({
          body: body.trim(),
          rig_model: rig.trim() || null,
          user_id: user.id,
          user_name: userName,
          avatar_url: userAvatarUrl,
          role: userRole,
          image_url: imageUrl,
        });
      
      if (insertError) throw new Error(insertError.message);

      showToast('Post uploaded!', 'success');
      onPosted?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Failed to post: ${msg}`, 'error');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('idle');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className="fixed bottom-0 left-0 right-0 z-[9991] max-w-md mx-auto bg-zinc-950 border border-zinc-800 rounded-t-2xl overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900">
              <button onClick={onClose} aria-label="Close drawer" className="p-1 text-zinc-400 hover:text-white transition-colors">
                <ChevronDown size={22} />
              </button>
              <span className="font-bold text-white text-[15px]">New Post</span>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleSubmit}
                disabled={!body.trim() || isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold text-[13px] rounded-full transition-colors min-w-[68px] justify-center"
              >
                {isSubmitting ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full inline-block"
                  />
                ) : (
                  <>
                    <Send size={13} strokeWidth={2.5} />
                    Post
                  </>
                )}
              </motion.button>
            </div>

            {/* Body */}
            <div className="px-4 pt-4 pb-3">
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What happened on the trail today?"
                maxLength={500}
                rows={4}
                className="w-full bg-transparent text-zinc-100 text-[15px] leading-relaxed placeholder:text-zinc-600 resize-none outline-none"
              />

              <input
                value={rig}
                onChange={(e) => setRig(e.target.value)}
                placeholder="Vehicle (e.g. 2022 Tacoma TRD Pro)"
                className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-[13px] text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-orange-500/60 transition-colors"
              />

              {/* Image preview */}
              {imagePreview && (
                <div className="relative mt-3 rounded-xl overflow-hidden border border-zinc-800">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-56 object-cover" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-zinc-300 hover:text-white"
                    aria-label="Remove image"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Footer toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-900">
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImagePick}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-[13px] text-zinc-500 hover:text-orange-400 transition-colors"
                >
                  <ImageIcon size={18} strokeWidth={1.8} />
                  <span>{imageFile ? imageFile.name.slice(0, 20) + (imageFile.name.length > 20 ? '…' : '') : 'Add Photo'}</span>
                </button>
                {uploadProgress !== 'idle' && (
                  <span className="text-[11px] text-orange-400 flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" />
                    {uploadProgress === 'uploading' ? 'Uploading…' : 'Saving…'}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-600 font-mono">{body.length}/500</span>
            </div>

            {/* Sticky Post button */}
            <div className="px-4 pb-6 pt-2" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={!body.trim() || isSubmitting}
                className="w-full py-4 rounded-2xl font-black text-[16px] flex items-center justify-center gap-2.5 transition-colors
                  disabled:bg-zinc-900 disabled:text-zinc-600
                  enabled:bg-orange-500 enabled:text-black enabled:shadow-lg enabled:shadow-orange-500/30 enabled:hover:bg-orange-600"
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Send size={16} strokeWidth={2.5} />
                    {body.trim() ? 'Post to Community' : 'Write something first…'}
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  user_id: string;
  image_url?: string;
  body?: string;
  caption: string;
  rig_model?: string;
  rig_specs?: string;
  likes_count: number;
  comments_count: number;
  reposts_count?: number;
  created_at: string;
  username?: string;
  user_name?: string;
  avatar_url?: string;
  verified?: boolean;
  role?: string;
  repost_of_id?: string | null;
  liked_by_me?: boolean;
  bookmarked_by_me?: boolean;
  reposted_by_me?: boolean;
  original_user_name?: string | null;
}

// ─── Placeholder data ─────────────────────────────────────────────────────────

const PLACEHOLDER_POSTS: Post[] = [
  {
    id: '1',
    user_id: '1',
    image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=900&q=85',
    caption: 'Fresh back from Holcomb Valley. The JK handled every rock garden like it was made for it — because it was. Fully worth the 4am wake-up. #JeepLife #HolcombValley #SoCalOffroad',
    rig_model: '2018 Jeep Wrangler JK',
    rig_specs: '37" BFG KO2 · 4" Rough Country lift · ARB winch',
    likes_count: 47,
    comments_count: 12,
    reposts_count: 6,
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
    username: 'TrailBlazer_Mike',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80',
    verified: true,
    role: 'owner',
  },
  {
    id: '2',
    user_id: '2',
    caption: 'Johnson Valley OHV is absolutely wild right now after the rains. Trails are soft but the views make up for every stuck wheel. Anyone else heading out this weekend? #JohnsonValley #DesertOffroad #Raptor',
    rig_model: '2020 Ford F-150 Raptor',
    rig_specs: 'Bilstein 6112 · stock gearing · rear locker',
    likes_count: 89,
    comments_count: 23,
    reposts_count: 14,
    created_at: new Date(Date.now() - 7_200_000).toISOString(),
    username: 'DesertRunner_Sarah',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
    verified: true,
  },
  {
    id: '3',
    user_id: '3',
    image_url: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=900&q=85',
    caption: 'Finally finished the front bumper swap. Took three weekends but the clearance angles are insane now. Big Bear run next Saturday — who\'s convoy-ing up? #TacomaLife #BigBear #BuildThread #PacificCrestTrail',
    rig_model: '2016 Toyota Tacoma TRD Pro',
    rig_specs: '33" Falken Wildpeak AT3W · Old Man Emu lift · CVT roof rack + RTT',
    likes_count: 124,
    comments_count: 31,
    reposts_count: 22,
    created_at: new Date(Date.now() - 14_400_000).toISOString(),
    username: 'TacoTuesday_Dan',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&q=80',
    verified: false,
  },
  {
    id: '4',
    user_id: '4',
    caption: 'Reminder: Cleghorn trail is OPEN again as of yesterday. Verified with the ranger station this morning. Moderate difficulty — good for stock rigs with decent ground clearance. Save this for reference. #Cleghorn #TrailUpdate #SoCal',
    rig_model: '2023 Toyota 4Runner TRD Off-Road',
    rig_specs: 'KDSS · 285/70R17 Duratracs · SOS recovery bag',
    likes_count: 211,
    comments_count: 44,
    reposts_count: 67,
    created_at: new Date(Date.now() - 28_800_000).toISOString(),
    username: 'RangerRick_OHV',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80',
    verified: true,
  },
];

// LIVE_RUNS and TRAIL_UPDATES are now fetched dynamically in StoriesBar.

// ─── Helpers ─────�����────────────────────────────────────────────────────────────

function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

function Caption({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  const parts = text.split(/(#\w+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('#') ? (
          <span key={i} className="text-orange-400 font-medium">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Image Lightbox ────────────────────────────────────────────────────���──────

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 bg-zinc-900 rounded-full text-zinc-300 hover:text-white z-10"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={20} />
      </button>
      <motion.img
        initial={{ scale: 0.88 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        src={src}
        alt={alt}
        className="max-w-full max-h-[90dvh] w-auto h-auto object-contain rounded-xl"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </motion.div>
  );
}

// ─── Story Avatar ─────────────────────────────────────────────────────────────

function StoryAvatar({ src, alt, live, label, href, runId }: {
  src: string; alt: string; live?: boolean; label: string; href: string; runId?: string;
}) {
  const router = useRouter();

  const handleClick = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    if (live && runId) {
      router.push(`/runs/${runId}`);
    } else {
      router.push(href);
    }
  };

  return (
    <button onClick={handleClick} className="flex flex-col items-center gap-1.5 flex-shrink-0 select-none">
      <motion.div whileTap={{ scale: 0.91 }} className="relative">
        {live && (
          <motion.div
            className="absolute -inset-1 rounded-full bg-orange-500/25"
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.12, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <div className={`relative w-[58px] h-[58px] rounded-full p-[2px] ${live ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-zinc-800'}`}>
          <div className="w-full h-full rounded-full overflow-hidden bg-zinc-950">
            <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />
          </div>
        </div>
        {live && (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-px bg-orange-500 text-black text-[8px] font-black uppercase rounded-full leading-tight">
            Live
          </span>
        )}
      </motion.div>
      <span className="text-[10px] text-zinc-500 truncate w-[58px] text-center font-medium">{label}</span>
    </button>
  );
}

// ─── StoriesBar ───────────────────────────────────────────────────────────────

interface LiveRun {
  id: string;
  title: string;
  trail_photo: string | null;
}

function StoriesBar() {
  const { supabaseClient } = useAuth();
  const [liveRuns, setLiveRuns] = useState<LiveRun[]>([]);

  useEffect(() => {
    if (!supabaseClient) return;
    // Use left join syntax: trail_id references trails table
    supabaseClient
      .from('runs')
      .select('id, title, trail_id, trail:trails(photo_url)')
      .eq('status', 'active')
      .order('date', { ascending: true })
      .limit(8)
      .then(({ data, error }) => {
        if (error) {
          // Fallback: fetch without join if trails table/FK doesn't exist yet
          supabaseClient
            .from('runs')
            .select('id, title')
            .eq('status', 'active')
            .order('date', { ascending: true })
            .limit(8)
            .then(({ data: fallbackData }) => {
              setLiveRuns(
                (fallbackData ?? []).map((r: any) => ({
                  id: r.id,
                  title: r.title ?? 'Live Run',
                  trail_photo: null,
                }))
              );
            });
          return;
        }
        setLiveRuns(
          (data ?? []).map((r: any) => ({
            id: r.id,
            title: r.title ?? 'Live Run',
            trail_photo: r.trail?.photo_url ?? null,
          }))
        );
      });
  }, [supabaseClient]);

  return (
    <div className="sticky top-[52px] z-40 bg-black border-b border-zinc-900">
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">

        {liveRuns.length === 0 ? (
          /* No active runs — show a single static Runs link */
          <Link href="/runs" className="flex flex-col items-center gap-1.5 flex-shrink-0 select-none">
            <div className="relative w-[58px] h-[58px] rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Radio size={18} className="text-zinc-500" />
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">Runs</span>
          </Link>
        ) : (
          liveRuns.map((run) => (
            <StoryAvatar
              key={run.id}
              src={run.trail_photo ?? 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=120&q=80'}
              alt={run.title}
              live
              label={run.title}
              href="/runs"
              runId={run.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Stat Button ──────────────────────────────────────────────────────────────

function StatBtn({
  icon: Icon,
  count,
  active,
  activeColor,
  label,
  onClick,
}: {
  icon: React.ElementType;
  count?: number;
  active?: boolean;
  activeColor?: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 1.28 }}
      transition={{ type: 'spring', stiffness: 600, damping: 14 }}
      onClick={onClick}
      aria-label={label}
      className={`flex items-center gap-1.5 group transition-colors ${
        active && activeColor ? activeColor : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      <Icon size={17} className={active ? '' : 'group-hover:scale-110 transition-transform'} strokeWidth={1.8} />
      {count !== undefined && count > 0 && (
        <span className="text-[12px] font-medium tabular-nums">{count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}</span>
      )}
    </motion.button>
  );
}

// ─── CommentRow ───────────────────────────────────────────────────────────────

function CommentRow({
  comment,
  onLike,
  onFlag,
  onReply,
  onDelete,
  currentUserId,
  currentUserRole,
  isReply = false,
}: {
  comment: Comment;
  onLike: (c: Comment) => void;
  onFlag: (c: Comment) => void;
  onReply: (c: Comment) => void;
  onDelete?: (c: Comment) => void;
  currentUserId?: string;
  currentUserRole?: string | null;
  isReply?: boolean;
}) {
  const canDelete = !!onDelete && (
    comment.user_id === currentUserId ||
    currentUserRole?.toLowerCase() === 'owner'
  );
  return (
    <div className="flex gap-2 items-start group">
      <div className={`${isReply ? 'w-5 h-5' : 'w-6 h-6'} rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden`}>
        {comment.avatar_url ? (
          <img src={comment.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-zinc-500">
            {(comment.user_name ?? 'U')[0].toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[12px] font-semibold text-zinc-300">{comment.user_name ?? 'Rider'}</span>
          {comment.role?.toLowerCase() === 'owner' && (
            <span className="px-1.5 py-px text-[9px] font-black text-black bg-[#FF8C00] rounded leading-none flex-shrink-0">
              OWNER
            </span>
          )}
          <span className="text-[12px] text-zinc-400 break-words">{comment.content}</span>
        </div>
        {/* Sub-row: actions */}
        <div className="flex items-center gap-3 mt-0.5">
          {/* Comment like */}
          <button
            onClick={() => onLike(comment)}
            aria-label={comment.liked_by_me ? 'Unlike comment' : 'Like comment'}
            className={`flex items-center gap-0.5 text-[11px] transition-colors ${
              comment.liked_by_me ? 'text-orange-400' : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            <Heart size={10} className={comment.liked_by_me ? 'fill-orange-400' : ''} strokeWidth={1.8} />
            {(comment.likes_count ?? 0) > 0 && <span>{comment.likes_count}</span>}
          </button>
          {/* Reply */}
          <button
            onClick={() => onReply(comment)}
            aria-label="Reply"
            className="text-[11px] text-zinc-600 hover:text-sky-400 transition-colors"
          >
            Reply
          </button>
          {/* Flag */}
          <button
            onClick={() => onFlag(comment)}
            aria-label="Flag comment"
            className="text-[11px] text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Flag size={10} strokeWidth={1.8} />
          </button>
          {/* Delete — only visible to comment owner or OWNER role */}
          {canDelete && (
            <button
              onClick={() => onDelete!(comment)}
              aria-label="Delete comment"
              className="text-[11px] text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={10} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── RigPostCard ──────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  user_name?: string | null;
  avatar_url?: string | null;
  parent_id?: string | null;
  role?: string | null;
  likes_count?: number;
  liked_by_me?: boolean;
}

function RigPostCard({ post, index }: {
  post: Post;
  index: number;
}) {
  const { user, isConfigured, supabaseClient, loading: authLoading, profile } = useAuth();
  const userRole = (profile?.role as string | null) ?? null;
  const { showToast } = useToast();
  const [liked, setLiked] = useState(post.liked_by_me ?? false);
  const [reposted, setReposted] = useState(post.reposted_by_me ?? false);
  const [bookmarked, setBookmarked] = useState(post.bookmarked_by_me ?? false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [repostsCount, setRepostsCount] = useState(post.reposts_count ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count ?? 0);
  const [postFlagged, setPostFlagged] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  async function haptic(s: ImpactStyle) { try { await Haptics.impact({ style: s }); } catch {} }

  // Track whether the drawer was just opened so we can auto-focus the input.
  const drawerJustOpened = useRef(false);
  useEffect(() => {
    if (commentsOpen) drawerJustOpened.current = true;
  }, [commentsOpen]);

  // Fetch comments on mount as soon as auth has settled.
  // NOT gated on commentsOpen — comments load in the background so the count
  // is always correct without the user needing to open the drawer.
  // commentsOpen is intentionally NOT in the dep array to avoid re-fetching
  // every time the drawer opens/closes and clearing any optimistic state.
  useEffect(() => {
    if (!supabaseClient) return;
    // Hard guard: wait for auth to resolve so user.id is known for likes query.
    if (authLoading) return;

    // CRITICAL: use the original post's ID for reposts — comments are anchored
    // to the canonical thread, not the repost copy.
    const canonicalId = post.repost_of_id ?? post.id;

    setCommentsLoading(true);

    Promise.all([
      // Use select('*') to avoid 400 errors if some columns don't exist yet.
      supabaseClient
        .from('comments')
        .select('*')
        .eq('post_id', canonicalId)
        .order('created_at', { ascending: true }),
      user
        ? supabaseClient
            .from('comment_likes')
            .select('comment_id')
            .eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
    ]).then(async ([{ data: rawComments, error: commentsError }, { data: myLikes }]) => {
      if (commentsError) {
        setCommentsLoading(false);
        return;
      }

      const rows = rawComments ?? [];

      // Separate query for author roles — avoids FK-join failures.
      const distinctUserIds = [...new Set(rows.map((c: any) => c.user_id as string))];
      let roleMap: Record<string, string | null> = {};
      if (distinctUserIds.length > 0) {
        const { data: userRows } = await supabaseClient
          .from('users')
          .select('id, role')
          .in('id', distinctUserIds);
        (userRows ?? []).forEach((u: any) => { roleMap[u.id] = u.role ?? null; });
      }

      const likedIds = new Set((myLikes ?? []).map((l: any) => l.comment_id));
      const enriched: Comment[] = rows.map((c: any) => ({
        ...c,
        // Live role from users table wins; denormalized column is fallback.
        role: roleMap[c.user_id] ?? c.role ?? null,
        // Explicitly use content column (not body) — matches DB schema.
        content: c.content ?? '',
        liked_by_me: likedIds.has(c.id),
        likes_count: c.likes_count ?? 0,
      }));

      setComments(enriched);
      // Update count to match live DB total for this canonical thread.
      if (enriched.length > 0) setCommentsCount(enriched.length);
      setCommentsLoading(false);
      if (drawerJustOpened.current) {
        drawerJustOpened.current = false;
        setTimeout(() => commentInputRef.current?.focus(), 150);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseClient, post.id, post.repost_of_id, user, authLoading]);

  const requireAuth = (action: string): boolean => {
    if (!user) {
      showToast(`Sign in to ${action}`, 'info');
      return false;
    }
    return true;
  };

  const toggleLike = async () => {
    await haptic(ImpactStyle.Medium);
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLikesCount((c) => (nowLiked ? c + 1 : c - 1));

    if (user && isConfigured && supabaseClient) {
      try {
        if (nowLiked) {
          const { error } = await supabaseClient
            .from('post_likes')
            .insert({ post_id: post.id, user_id: user.id });
          if (error && error.code !== '23505') throw error;
        } else {
          const { error } = await supabaseClient
            .from('post_likes')
            .delete()
            .match({ post_id: post.id, user_id: user.id });
          if (error) throw error;
        }
      } catch {
        setLiked(!nowLiked);
        setLikesCount((c) => (nowLiked ? c - 1 : c + 1));
        showToast('Could not save like. Try again.', 'error');
      }
    } else if (!user) {
      showToast('Sign in to like posts', 'info');
    }
  };

  const toggleRepost = async () => {
    if (!requireAuth('repost')) return;
    if (!supabaseClient || !user) return;
    await haptic(ImpactStyle.Light);
    if (reposted) {
      // Un-repost: delete the repost row
      const { error } = await supabaseClient
        .from('posts')
        .delete()
        .eq('user_id', user.id)
        .eq('repost_of_id', post.id);
      if (!error) { setReposted(false); setRepostsCount((c) => c - 1); }
    } else {
      const userName = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Rider';
      const { error } = await supabaseClient.from('posts').insert({
        user_id: user.id,
        user_name: userName,
        body: post.body ?? post.caption ?? '',
        image_url: post.image_url ?? null,
        rig_model: post.rig_model ?? null,
        repost_of_id: post.id,
        role: 'user',
      });
      if (!error) { setReposted(true); setRepostsCount((c) => c + 1); showToast('Reposted!', 'success'); }
      else showToast('Could not repost', 'error');
    }
  };

  const flagPost = async () => {
    if (!requireAuth('flag posts')) return;
    if (!supabaseClient || !user || postFlagged) return;
    const { error } = await supabaseClient
      .from('post_flags')
      .insert({ post_id: post.id, user_id: user.id, reason: 'flagged' });
    if (!error) { setPostFlagged(true); showToast('Post flagged for review', 'info'); }
  };

  const toggleCommentLike = async (comment: Comment) => {
    if (!requireAuth('like comments')) return;
    if (!supabaseClient || !user) return;
    const commentId = comment.id;

    // Read current liked state directly from the flat comments array so stale
    // closure values from nested renders don't cause a double-toggle.
    let nowLiked = false;
    setComments((prev) => {
      const current = prev.find((c) => c.id === commentId);
      nowLiked = !(current?.liked_by_me ?? false);
      return prev.map((c) =>
        c.id === commentId
          ? { ...c, liked_by_me: nowLiked, likes_count: (c.likes_count ?? 0) + (nowLiked ? 1 : -1) }
          : c
      );
    });

    if (nowLiked) {
      const { error } = await supabaseClient
        .from('comment_likes')
        .insert({ comment_id: commentId, user_id: user.id });
      if (error && error.code !== '23505') {
        // Rollback on unexpected error
        setComments((prev) => prev.map((c) =>
          c.id === commentId ? { ...c, liked_by_me: false, likes_count: (c.likes_count ?? 1) - 1 } : c
        ));
      }
    } else {
      await supabaseClient
        .from('comment_likes')
        .delete()
        .match({ comment_id: commentId, user_id: user.id });
    }
  };

  const flagComment = async (comment: Comment) => {
    if (!requireAuth('flag comments')) return;
    if (!supabaseClient || !user) return;
    const { error } = await supabaseClient
      .from('comment_flags')
      .insert({ comment_id: comment.id, user_id: user.id, reason: 'flagged' });
    if (!error) showToast('Comment flagged', 'info');
  };

  const toggleBookmark = async () => {
    await haptic(ImpactStyle.Light);
    if (!requireAuth('save posts')) return;
    const nowSaved = !bookmarked;
    setBookmarked(nowSaved);
    if (supabaseClient && user) {
      try {
        if (nowSaved) {
          const { error } = await supabaseClient
            .from('saved_posts')
            .insert({ post_id: post.id, user_id: user.id });
          if (error && error.code !== '23505') throw error;
        } else {
          const { error } = await supabaseClient
            .from('saved_posts')
            .delete()
            .match({ post_id: post.id, user_id: user.id });
          if (error) throw error;
        }
      } catch {
        setBookmarked(!nowSaved);
        showToast('Could not update bookmark', 'error');
      }
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || !user || !supabaseClient) return;
    if (!requireAuth('comment')) return;
    setSubmittingComment(true);
    // Always anchor the comment to the original post so comments are shared
    // across all reposts of the same content.
    const canonicalPostId = post.repost_of_id ?? post.id;
    const userName = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Rider';
    const avatarUrl = (user.user_metadata?.avatar_url as string) || null;
    const optimistic: Comment = {
      id: crypto.randomUUID(),
      user_id: user.id,
      post_id: canonicalPostId,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
      user_name: userName,
      avatar_url: avatarUrl,
      parent_id: replyingTo?.id ?? null,
      liked_by_me: false,
      likes_count: 0,
    };
    setComments((c) => [...c, optimistic]);
    setCommentsCount((n) => n + 1);
    setCommentText('');
    setReplyingTo(null);
    try {
      const { error } = await supabaseClient.from('comments').insert({
        post_id: canonicalPostId,
        user_id: user.id,
        content: optimistic.content,
        user_name: userName,
        avatar_url: avatarUrl,
        parent_id: replyingTo?.id ?? null,
      });
      if (error) throw error;
    } catch {
      setComments((c) => c.filter((x) => x.id !== optimistic.id));
      setCommentsCount((n) => n - 1);
      showToast('Failed to post comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    await haptic(ImpactStyle.Light);
    const url = typeof window !== 'undefined' ? `${window.location.origin}/posts/${post.id}` : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${post.username}'s Rig`, text: post.caption, url });
        showToast('Post shared!', 'success');
      } catch {}
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard', 'success');
      } catch {}
    }
  };

  const submitReport = async () => {
    if (!reportReason.trim() || !user) return;
    setIsReporting(true);
    try {
      if (supabaseClient) {
        await supabaseClient.from('reports').insert({
          post_id: post.id,
          reporter_id: user.id,
          reason: reportReason,
        });
      }
      showToast('Report submitted. Thank you.', 'success');
      setReportOpen(false);
      setReportReason('');
      setMenuOpen(false);
    } catch {
      showToast('Failed to submit report', 'error');
    } finally {
      setIsReporting(false);
    }
  };

  const deleteComment = async (comment: Comment) => {
    if (!supabaseClient || !user) return;
    const isOwner = userRole === 'owner';
    if (comment.user_id !== user.id && !isOwner) return;
    // Optimistic removal
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    setCommentsCount((n) => Math.max(0, n - 1));
    const { error } = await supabaseClient
      .from('comments')
      .delete()
      .eq('id', comment.id);
    if (error) {
      // Rollback on failure
      setComments((prev) => [...prev, comment].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      setCommentsCount((n) => n + 1);
      showToast('Failed to delete comment', 'error');
    } else {
      showToast('Comment deleted', 'success');
    }
  };

  const handleDelete = async () => {
    if (!supabaseClient || !user) return;
    // Guard: only owner or post author can delete
    if (user.id !== post.user_id && userRole !== 'owner') {
      showToast('You cannot delete this post', 'error');
      return;
    }
    try {
      const { error } = await supabaseClient.from('posts').delete().eq('id', post.id);
      if (error) throw error;
      showToast('Post deleted', 'success');
      // Trigger parent refresh
      await new Promise(resolve => setTimeout(resolve, 300));
      window.location.reload();
    } catch {
      showToast('Failed to delete post', 'error');
    }
  };

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.3 }}
        className="flex gap-3 px-4 py-4 border-b border-zinc-900 bg-black"
      >
        {/* ── Left column: avatar ───────────────── */}
        <Link href={`/profile/${post.user_id}`} className="flex-shrink-0 pt-0.5 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 ring-1 ring-zinc-700">
            {post.avatar_url && !avatarError ? (
              <img
                src={post.avatar_url}
                alt={post.username ?? 'User'}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold text-sm">
                {(post.username ?? 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
        </Link>

        {/* ── Right column: content ─────────────── */}
        <div className="flex-1 min-w-0">

          {/* Repost banner */}
          {post.repost_of_id && (
            <div className="flex items-center gap-1 text-[11px] text-zinc-500 mb-1">
              <Repeat2 size={12} className="text-emerald-500/70" />
              <span>
                {post.username ?? 'Rider'} reposted
                {post.original_user_name ? ` · ${post.original_user_name}` : ''}
              </span>
            </div>
          )}

          {/* Header row: name + verified + vehicle + time + menu */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0 flex-1">
              {/* Name + verified */}
              <Link href={`/profile/${post.user_id}`} className="flex items-center gap-1 flex-wrap hover:opacity-80 transition-opacity">
                <span className="font-bold text-[14px] text-white leading-snug">
                  {post.username ?? 'Anonymous'}
                </span>
                {post.verified && (
                  <BadgeCheck size={15} className="text-orange-500 flex-shrink-0 mt-px" />
                )}
                {post.role?.toLowerCase() === 'owner' && (
                  <span className="px-2 py-0.5 text-[10px] font-black text-black bg-[#FF8C00] rounded-md leading-none flex-shrink-0">
                    OWNER
                  </span>
                )}
              </Link>
              {(post.rig_model || post.rig_specs) && (
                <span className="text-[11px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-px rounded-full font-medium leading-snug truncate max-w-[160px]">
                  {post.rig_model || post.rig_specs}
                </span>
              )}
              <span className="text-[11px] text-zinc-600">{timeAgo(post.created_at)}</span>
            </div>

            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="p-1 -mt-0.5 -mr-1 text-zinc-600 hover:text-zinc-400 transition-colors rounded-full"
                aria-label="More options"
              >
                <MoreHorizontal size={18} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-7 z-50 min-w-[160px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl shadow-black/60 overflow-hidden"
                  >
                    <button
                      onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/posts/${post.id}`); showToast('Link copied', 'success'); setMenuOpen(false); }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] text-zinc-300 hover:bg-zinc-800 transition-colors text-left"
                    >
                      <Share2 size={14} className="text-zinc-500" /> Copy Link
                    </button>
                    <button
                      onClick={() => { setReportOpen(true); setMenuOpen(false); }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] text-red-400 hover:bg-zinc-800 transition-colors text-left border-t border-zinc-800"
                    >
                      <Flag size={14} /> Report Post
                    </button>
                    {(user?.id === post.user_id || userRole === 'owner') && (
                      <button
                        onClick={() => { handleDelete(); setMenuOpen(false); }}
                        className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] text-red-500 hover:bg-red-500/10 transition-colors text-left border-t border-zinc-800"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Caption body */}
          <p className="text-[14px] text-zinc-200 leading-relaxed mb-3">
              <Caption text={post.body ?? post.caption} />
          </p>

          {/* Optional media — natural aspect ratio, NOT forced square */}
          {post.image_url && (
            <div className="relative mb-3 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 group cursor-zoom-in">
              <img
                src={post.image_url}
                alt={post.caption}
                className="w-full object-cover"
                loading="lazy"
                onClick={() => setLightboxOpen(true)}
                draggable={false}
              />
              <button
                onClick={() => setLightboxOpen(true)}
                className="absolute bottom-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Zoom image"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          )}

          {/* Rig specs pill row */}
          {post.rig_specs && (
            <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
              <span className="inline-block bg-zinc-900 border border-zinc-800 rounded-full px-2 py-0.5 text-zinc-400">
                {post.rig_specs}
              </span>
            </p>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <StatBtn
                icon={MessageCircle}
                count={commentsCount}
                active={commentsOpen}
                activeColor="text-sky-400"
                label="Comment"
                onClick={() => {
                  if (!requireAuth('comment')) return;
                  setCommentsOpen((o) => !o);
                }}
              />
              <StatBtn
                icon={Repeat2}
                count={repostsCount}
                active={reposted}
                activeColor="text-emerald-500"
                label={reposted ? 'Unrepost' : 'Repost'}
                onClick={toggleRepost}
              />
              <StatBtn
                icon={Heart}
                count={likesCount}
                active={liked}
                activeColor="text-orange-500"
                label={liked ? 'Unlike' : 'Like'}
                onClick={toggleLike}
              />
              <StatBtn icon={Share2} label="Share" onClick={handleShare} />
              <motion.button
                whileTap={{ scale: 1.2 }}
                onClick={flagPost}
                disabled={postFlagged}
                aria-label="Flag post"
                title="Flag for review"
                className={`transition-colors ${postFlagged ? 'text-red-400' : 'text-zinc-600 hover:text-red-400'}`}
              >
                <Flag size={15} strokeWidth={1.8} />
              </motion.button>
            </div>
            <motion.button
              whileTap={{ scale: 1.28 }}
              transition={{ type: 'spring', stiffness: 600, damping: 14 }}
              onClick={toggleBookmark}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark post'}
              className={`transition-colors ${bookmarked ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Bookmark size={17} strokeWidth={1.8} className={bookmarked ? 'fill-orange-500/40' : ''} />
            </motion.button>
          </div>

          {/* Inline comment panel */}
          <AnimatePresence>
            {commentsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-zinc-800/60 mt-3 space-y-3">
                  {/* Comment list */}
                  {commentsLoading ? (
                    <div className="text-zinc-600 text-[12px] py-1">Loading comments...</div>
                  ) : comments.length === 0 ? (
                    <div className="text-zinc-600 text-[12px] py-1">No comments yet. Be the first.</div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {/* Top-level comments first, then replies */}
                      {comments.filter((c) => !c.parent_id).map((c) => (
                        <div key={c.id}>
                          <CommentRow
                            comment={c}
                            onLike={toggleCommentLike}
                            onFlag={flagComment}
                            onReply={(c) => { setReplyingTo(c); setTimeout(() => commentInputRef.current?.focus(), 80); }}
                            onDelete={deleteComment}
                            currentUserId={user?.id}
                            currentUserRole={userRole}
                          />
                          {/* Replies (indented) */}
                          {comments.filter((r) => r.parent_id === c.id).map((reply) => (
                            <div key={reply.id} className="ml-7 mt-1.5 flex items-start gap-1 text-zinc-600">
                              <CornerDownRight size={11} className="mt-1 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <CommentRow
                                  comment={reply}
                                  onLike={toggleCommentLike}
                                  onFlag={flagComment}
                                  onReply={(c) => { setReplyingTo(c); setTimeout(() => commentInputRef.current?.focus(), 80); }}
                                  onDelete={deleteComment}
                                  currentUserId={user?.id}
                                  currentUserRole={userRole}
                                  isReply
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply-to chip */}
                  {replyingTo && (
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 bg-zinc-900 rounded-lg px-2 py-1">
                      <CornerDownRight size={11} className="text-sky-400 flex-shrink-0" />
                      <span className="flex-1 truncate">Replying to <span className="text-zinc-300 font-semibold">{replyingTo.user_name ?? 'Rider'}</span></span>
                      <button onClick={() => setReplyingTo(null)} className="text-zinc-600 hover:text-white transition-colors flex-shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  {/* Comment input */}
                  <div className="flex gap-2 items-center">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden">
                      {user?.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url as string} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-zinc-500">
                          {user?.email?.[0]?.toUpperCase() ?? 'U'}
                        </div>
                      )}
                    </div>
                    <input
                      ref={commentInputRef}
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                      placeholder={replyingTo ? `Reply to ${replyingTo.user_name ?? 'Rider'}…` : 'Add a comment…'}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 text-[12px] text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={submitComment}
                      disabled={!commentText.trim() || submittingComment}
                      aria-label="Post comment"
                      className="text-orange-500 disabled:text-zinc-700 transition-colors flex-shrink-0"
                    >
                      {submittingComment ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} strokeWidth={2} />}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.article>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && post.image_url && (
          <ImageLightbox
            src={post.image_url}
            alt={post.caption}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Report Sheet */}
      <AnimatePresence>
        {reportOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9992] bg-black/70 backdrop-blur-sm"
              onClick={() => setReportOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              className="fixed bottom-0 left-0 right-0 z-[9993] max-w-md mx-auto bg-zinc-950 border border-zinc-800 rounded-t-2xl p-5"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-[15px] flex items-center gap-2">
                  <Flag size={15} className="text-red-400" /> Report Post
                </h3>
                <button onClick={() => setReportOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              <p className="text-[13px] text-zinc-400 mb-3">Why are you reporting this post?</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {['Spam', 'Misinformation', 'Harassment', 'Inappropriate', 'Dangerous activity', 'Other'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setReportReason(r)}
                    className={`py-2.5 px-3 rounded-xl text-[12px] font-medium border transition-colors text-left ${
                      reportReason === r
                        ? 'bg-orange-500/15 border-orange-500/50 text-orange-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={submitReport}
                disabled={!reportReason || isReporting}
                className="w-full py-3 bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-[14px] rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {isReporting ? <Loader2 size={16} className="animate-spin" /> : <Flag size={15} />}
                {isReporting ? 'Submitting…' : 'Submit Report'}
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Pull-to-refresh container ────────────────────────────────────────────────

function PullToRefreshFeed({ children, onRefresh }: { children: React.ReactNode; onRefresh: () => Promise<void> }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pullDistance = useRef(0);
  const THRESHOLD = 72;

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === 0) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      pullDistance.current = delta;
      setPulling(delta > 20);
    }
  };

  const onTouchEnd = async () => {
    if (pullDistance.current > THRESHOLD && !refreshing) {
      setRefreshing(true);
      try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
      await onRefresh();
      setRefreshing(false);
    }
    startY.current = 0;
    pullDistance.current = 0;
    setPulling(false);
  };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <AnimatePresence>
        {(pulling || refreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            className="flex justify-center py-4"
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : {}}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-7 h-7 rounded-full border-2 border-orange-500 border-t-transparent"
            />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}

// ─── Page ───��─────────────────────────────────────────────────────────────────

// ─── Moderation Panel ─────────────────────────────────────────────────────────

function ModerationPanel() {
  const { supabaseClient } = useAuth();
  const [open, setOpen] = useState(false);
  const [flaggedPosts, setFlaggedPosts] = useState<any[]>([]);
  const [flaggedComments, setFlaggedComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!supabaseClient) return;
    setLoading(true);
    const [postFlagData, commentFlagData] = await Promise.all([
      supabaseClient.from('post_flags').select('post_id'),
      supabaseClient.from('comment_flags').select('comment_id'),
    ]);

    const postCounts: Record<string, number> = {};
    (postFlagData.data ?? []).forEach((r: any) => {
      postCounts[r.post_id] = (postCounts[r.post_id] ?? 0) + 1;
    });
    const flaggedPostIds = Object.entries(postCounts).filter(([, n]) => n >= 3).map(([id]) => id);

    const commentCounts: Record<string, number> = {};
    (commentFlagData.data ?? []).forEach((r: any) => {
      commentCounts[r.comment_id] = (commentCounts[r.comment_id] ?? 0) + 1;
    });
    const flaggedCommentIds = Object.entries(commentCounts).filter(([, n]) => n >= 3).map(([id]) => id);

    const [postRows, commentRows] = await Promise.all([
      flaggedPostIds.length > 0
        ? supabaseClient.from('posts').select('id, body, user_name, created_at').in('id', flaggedPostIds)
        : Promise.resolve({ data: [] }),
      flaggedCommentIds.length > 0
        ? supabaseClient.from('comments').select('id, content, user_name, created_at').in('id', flaggedCommentIds)
        : Promise.resolve({ data: [] }),
    ]);

    setFlaggedPosts(postRows.data ?? []);
    setFlaggedComments(commentRows.data ?? []);
    setLoading(false);
  };

  const dismiss = async (type: 'post' | 'comment', id: string) => {
    if (!supabaseClient) return;
    if (type === 'post') {
      await supabaseClient.from('post_flags').delete().eq('post_id', id);
      setFlaggedPosts((p) => p.filter((x) => x.id !== id));
    } else {
      await supabaseClient.from('comment_flags').delete().eq('comment_id', id);
      setFlaggedComments((p) => p.filter((x) => x.id !== id));
    }
  };

  const totalFlags = flaggedPosts.length + flaggedComments.length;

  return (
    <>
      <button
        onClick={() => { setOpen(true); load(); }}
        className="relative flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-[12px] font-semibold hover:bg-red-500/20 transition-colors"
      >
        <ShieldAlert size={13} />
        Moderation
        {totalFlags > 0 && (
          <span className="ml-0.5 bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-px leading-none">
            {totalFlags}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              className="fixed bottom-0 left-0 right-0 z-[9991] max-w-md mx-auto bg-zinc-950 border border-zinc-800 rounded-t-2xl max-h-[80dvh] flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={15} className="text-red-400" />
                  <h3 className="font-bold text-white text-[15px]">Moderation Queue</h3>
                </div>
                <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                  <div className="flex justify-center pt-4"><Loader2 size={20} className="animate-spin text-zinc-600" /></div>
                ) : (flaggedPosts.length + flaggedComments.length) === 0 ? (
                  <p className="text-zinc-600 text-[14px] text-center pt-4">No flagged content.</p>
                ) : (
                  <>
                    {flaggedPosts.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                          Flagged Posts ({flaggedPosts.length})
                        </p>
                        <div className="space-y-2">
                          {flaggedPosts.map((p) => (
                            <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-zinc-400 text-[11px] mb-0.5">{p.user_name ?? 'Unknown'}</p>
                                <p className="text-white text-[13px] leading-relaxed line-clamp-3">{p.body}</p>
                              </div>
                              <button
                                onClick={() => dismiss('post', p.id)}
                                className="flex-shrink-0 text-[11px] text-zinc-500 hover:text-emerald-400 transition-colors border border-zinc-700 rounded-lg px-2 py-1"
                              >
                                Dismiss
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {flaggedComments.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                          Flagged Comments ({flaggedComments.length})
                        </p>
                        <div className="space-y-2">
                          {flaggedComments.map((c) => (
                            <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-zinc-400 text-[11px] mb-0.5">{c.user_name ?? 'Unknown'}</p>
                                <p className="text-white text-[13px] leading-relaxed line-clamp-3">{c.content}</p>
                              </div>
                              <button
                                onClick={() => dismiss('comment', c.id)}
                                className="flex-shrink-0 text-[11px] text-zinc-500 hover:text-emerald-400 transition-colors border border-zinc-700 rounded-lg px-2 py-1"
                              >
                                Dismiss
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { user, supabaseClient, loading: authLoading } = useAuth();
  const router = useRouter();

  // Fetch the current user's role for moderation access
  useEffect(() => {
    if (!user || !supabaseClient) return;
    supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data) setUserRole(data.role ?? null); });
  }, [user, supabaseClient]);

  const isModeratorUser = userRole === 'owner' || userRole === 'admin';

  const fetchPosts = useCallback(async () => {
    // Strict guard: do NOT execute until auth has fully settled.
    // authLoading=true means user.id is not yet known — interaction queries
    // (post_likes, saved_posts, repost rows) would all return empty results.
    if (authLoading) return;
    if (!supabaseClient) {
      setPosts(PLACEHOLDER_POSTS);
      setIsLoading(false);
      return;
    }
    try {
      // Fetch posts + user interaction booleans in parallel
      // Note: posts.user_id references auth.users, not public.users, so we can't join.
      // We rely on denormalized avatar_url/role columns on posts table.
      const [postsResult, likesResult, savedResult, repostsResult] = await Promise.all([
        supabaseClient
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30),
        user
          ? supabaseClient.from('post_likes').select('post_id').eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
        user
          ? supabaseClient.from('saved_posts').select('post_id').eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
        user
          ? supabaseClient
              .from('posts')
              .select('repost_of_id')
              .eq('user_id', user.id)
              .not('repost_of_id', 'is', null)
          : Promise.resolve({ data: [] }),
      ]);

      if (postsResult.error) throw postsResult.error;

      const rawPosts: any[] = postsResult.data ?? [];

      // For repost rows, look up the original post so the banner and counts
      // (likes, comments) reflect the canonical thread, not the repost copy.
      const repostOriginalIds = [...new Set(
        rawPosts.filter((p) => p.repost_of_id).map((p) => p.repost_of_id as string)
      )];
      type OriginalMeta = { user_name: string; likes_count: number; comments_count: number };
      let originalMeta: Record<string, OriginalMeta> = {};
      if (repostOriginalIds.length > 0) {
        const { data: originals } = await supabaseClient
          .from('posts')
          .select('id, user_name, likes_count, comments_count')
          .in('id', repostOriginalIds);
        (originals ?? []).forEach((o: any) => {
          originalMeta[o.id] = {
            user_name: o.user_name ?? 'Rider',
            likes_count: o.likes_count ?? 0,
            comments_count: o.comments_count ?? 0,
          };
        });
      }

      const likedIds = new Set((likesResult.data ?? []).map((r: any) => r.post_id));
      const savedIds = new Set((savedResult.data ?? []).map((r: any) => r.post_id));
      // repostedIds contains the original post IDs that this user has reposted
      const repostedIds = new Set((repostsResult.data ?? []).map((r: any) => r.repost_of_id));

      const normalised = rawPosts.map((p: any) => {
        const orig = p.repost_of_id ? (originalMeta[p.repost_of_id] ?? null) : null;
        return {
          ...p,
          username: p.user_name ?? 'Rider',
          role: p.role ?? 'user',
          // Use denormalized avatar_url from posts table
          avatar_url: p.avatar_url ?? null,
          liked_by_me: likedIds.has(p.id),
          bookmarked_by_me: savedIds.has(p.id),
          reposted_by_me: p.repost_of_id
            ? repostedIds.has(p.repost_of_id)
            : repostedIds.has(p.id),
          // Repost rows: show the original thread's engagement counts so it
          // feels like the same post everywhere in the feed.
          likes_count: orig ? orig.likes_count : (p.likes_count ?? 0),
          comments_count: orig ? orig.comments_count : (p.comments_count ?? 0),
          original_user_name: orig ? orig.user_name : null,
        };
      });
      setPosts(normalised.length ? normalised : PLACEHOLDER_POSTS);
    } catch {
      setPosts(PLACEHOLDER_POSTS);
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, user, authLoading]);

  // Re-run whenever auth state resolves (authLoading flips false) so interactions hydrate correctly
  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return (
    <div className="min-h-screen bg-black">

      {/* ── Sticky Top Header ─────────────────────── */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-zinc-900">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="text-black font-black text-[10px] tracking-tight">PO</span>
            </div>
            <span className="font-black text-white text-base tracking-tight">
              Project<span className="text-orange-500">Offroad</span>
            </span>
          </div>
          {isModeratorUser && <ModerationPanel />}
        </div>
      </header>

      {/* ── Main ──────────────────────────────────── */}
      <main className="max-w-md mx-auto min-h-screen bg-black pb-24">
        {/* Stories */}
        <StoriesBar />

        {/* Feed */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 pt-4"
            >
              <FeedSkeleton count={3} />
            </motion.div>
          ) : (
            <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <PullToRefreshFeed onRefresh={fetchPosts}>
                {posts.map((post, i) => (
                  <RigPostCard key={post.id} post={post} index={i} />
                ))}
              </PullToRefreshFeed>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── FAB ───────────────────────────────────── */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => user ? setDrawerOpen(true) : router.push('/login')}
        aria-label="Create post"
        className="fixed bottom-[88px] right-4 z-40 w-[52px] h-[52px] bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30"
      >
        <Plus size={22} className="text-black" strokeWidth={2.5} />
      </motion.button>

      {/* ── New Post Drawer ────────────────────────── */}
      <NewPostDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onPosted={fetchPosts} />

      <DisclaimerModal />
      <BottomNav />
    </div>
  );
}
