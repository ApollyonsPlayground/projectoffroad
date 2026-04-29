'use client';

import { useState, useEffect, useRef } from 'react';
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
  const { user, isConfigured, supabaseClient } = useAuth();
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

      // Step 2: use user metadata directly (no DB lookup needed)
      const userName = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'Rider';
      const userRole = 'user'; // Default role; will be set to 'owner' via Supabase if applicable

      // Step 3: insert post row — using supabaseClient from AuthContext (has auth session)
      const { error: insertError } = await supabaseClient!
        .from('posts')
        .insert({
          body: body.trim(),
          rig_model: rig.trim() || null,
          user_id: user.id,
          user_name: userName,
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

const LIVE_RUNS = [
  { id: 'run-bigbear-001', name: 'Big Bear', avatar: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=120&q=80' },
  { id: 'run-jvalley-002', name: 'J-Valley', avatar: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=120&q=80' },
  { id: 'run-holcomb-003', name: 'Holcomb', avatar: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=120&q=80' },
];

const TRAIL_UPDATES = [
  { id: '1', name: 'Cleghorn', avatar: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=120&q=80' },
  { id: '2', name: 'Corral Cyn', avatar: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=120&q=80' },
  { id: '3', name: 'Miller Jeep', avatar: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=120&q=80' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

function Caption({ text }: { text: string }) {
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

// ─── Image Lightbox ───────────────────────────────────────────────────────────

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

function StoriesBar() {
  return (
    <div className="sticky top-[52px] z-40 bg-black border-b border-zinc-900">
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
        {/* Live header */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            <motion.div
              className="absolute -inset-1 rounded-full bg-orange-500/20"
              animate={{ scale: [1, 1.22, 1], opacity: [0.5, 0.08, 0.5] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative w-[58px] h-[58px] rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-[0_0_16px_rgba(249,115,22,0.4)]">
              <Radio size={18} className="text-white" />
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 font-medium">Runs</span>
        </div>

        {LIVE_RUNS.map((r) => (
          <StoryAvatar key={r.id} src={r.avatar} alt={r.name} live label={r.name} href="/runs" runId={r.id} />
        ))}

        <div className="w-px bg-zinc-800 self-stretch my-2 flex-shrink-0 mx-1" />

        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="w-[58px] h-[58px] rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Mountain size={18} className="text-zinc-600" />
          </div>
          <span className="text-[10px] text-zinc-500 font-medium">Trails</span>
        </div>

        {TRAIL_UPDATES.map((t) => <StoryAvatar key={t.id} src={t.avatar} alt={t.name} label={t.name} href="/trails" />)}
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

// ─── RigPostCard ──────────────────────────────────────────────────────────────

function RigPostCard({ post, index }: {
  post: Post;
  index: number;
}) {
  const { user, isConfigured, supabaseClient } = useAuth();
  const { showToast } = useToast();
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [repostsCount, setRepostsCount] = useState(post.reposts_count ?? 0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
            .from('likes')
            .insert({ post_id: post.id, user_id: user.id });
          // Ignore UNIQUE constraint violations (already liked)
          if (error && error.code !== '23505') {
            throw error;
          }
        } else {
          const { error } = await supabaseClient
            .from('likes')
            .delete()
            .match({ post_id: post.id, user_id: user.id });
          if (error) throw error;
        }
      } catch (err) {
        setLiked(!nowLiked);
        setLikesCount((c) => (nowLiked ? c - 1 : c + 1));
        showToast('Could not save like. Try again.', 'error');
      }
    } else if (!user) {
      showToast('Sign in to sync your likes', 'info');
    }
  };

  const toggleRepost = async () => {
    if (!requireAuth('repost')) return;
    await haptic(ImpactStyle.Light);
    setReposted((p) => { setRepostsCount((c) => (p ? c - 1 : c + 1)); return !p; });
  };

  const toggleBookmark = async () => {
    await haptic(ImpactStyle.Light);
    if (!requireAuth('save posts')) return;
    const nowSaved = !bookmarked;
    setBookmarked(nowSaved);
    if (supabaseClient && user) {
      try {
        if (bookmarked) {
          await supabaseClient.from('bookmarks').insert({ post_id: post.id, user_id: user.id });
        } else {
          await supabaseClient.from('bookmarks').delete().match({ post_id: post.id, user_id: user.id });
        }
      } catch {
        setBookmarked(!nowSaved);
        showToast('Could not update bookmark', 'error');
      }
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

  const handleDelete = async () => {
    if (!supabaseClient || !user) return;
    // Guard: only owner or post author can delete
    if (user.id !== post.user_id && (user as any).role !== 'owner') {
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
                {post.role === 'owner' && (
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
                    {(user?.id === post.user_id || user?.role === 'owner') && (
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
            <Caption text={post.caption} />
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

          {/* Action bar: Reply · Repost · Like · Share · Trail-Save */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <StatBtn icon={MessageCircle} count={post.comments_count} label="Reply" />
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
            </div>

            {/* Bookmark */}
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

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, supabaseClient } = useAuth();
  const router = useRouter();

  const fetchPosts = async () => {
    if (!supabaseClient) {
      setPosts(PLACEHOLDER_POSTS);
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabaseClient
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      // Normalise: map user_name → username, ensure role defaults to 'user'
      const normalised = (data ?? []).map((p: any) => ({
        ...p,
        username: p.user_name ?? 'Rider',
        role: p.role ?? 'user',
      }));
      setPosts(normalised.length ? normalised : PLACEHOLDER_POSTS);
    } catch {
      setPosts(PLACEHOLDER_POSTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

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
