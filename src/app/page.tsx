'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  BadgeCheck,
  Radio,
  Mountain,
  Plus,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { FeedSkeleton } from '@/components/SkeletonLoader';
import DisclaimerModal from '@/components/DisclaimerModal';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  rig_name?: string;
  rig_specs?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  username?: string;
  avatar_url?: string;
  verified?: boolean;
}

// ─── Placeholder data ─────────────────────────────────────────────────────────

const PLACEHOLDER_POSTS: Post[] = [
  {
    id: '1',
    user_id: '1',
    image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80',
    caption: 'Fresh back from Holcomb Valley. This JK handled the rock gardens like a champ! #JeepLife #HolcombValley #SoCalOffroad',
    rig_name: '2018 Jeep Wrangler JK',
    rig_specs: '37" KO2s · 4" lift · ARB winch',
    likes_count: 47,
    comments_count: 12,
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
    username: 'TrailBlazer_Mike',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
    verified: true,
  },
  {
    id: '2',
    user_id: '2',
    image_url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80',
    caption: 'Desert vibes at Johnson Valley OHV. Perfect weather for dune runs. #DesertLife #Raptor #JohnsonValley',
    rig_name: '2020 Ford F-150 Raptor',
    rig_specs: 'Stock + Bilstein 6112 · skid plates',
    likes_count: 89,
    comments_count: 23,
    created_at: new Date(Date.now() - 7_200_000).toISOString(),
    username: 'DesertRunner_Sarah',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
    verified: true,
  },
  {
    id: '3',
    user_id: '3',
    image_url: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80',
    caption: 'New front bumper finally fitted. Big Bear run next Saturday — who\'s in? #TacomaLife #BigBear #BuildThread',
    rig_name: '2016 Toyota Tacoma TRD Pro',
    rig_specs: '33" Falken Wildpeak · roof rack · RTT',
    likes_count: 124,
    comments_count: 31,
    created_at: new Date(Date.now() - 14_400_000).toISOString(),
    username: 'TacoTuesday_Dan',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80',
    verified: false,
  },
];

const LIVE_RUNS = [
  { id: '1', name: 'Big Bear', avatar: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=100&q=80' },
  { id: '2', name: 'J-Valley', avatar: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=100&q=80' },
  { id: '3', name: 'Holcomb', avatar: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=100&q=80' },
];

const TRAIL_UPDATES = [
  { id: '1', name: 'Cleghorn', avatar: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=100&q=80' },
  { id: '2', name: 'Corral Cyn', avatar: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=100&q=80' },
  { id: '3', name: 'Miller Jeep', avatar: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=100&q=80' },
  { id: '4', name: 'Burns Cyn', avatar: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=100&q=80' },
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
          <span key={i} className="text-orange-500 font-medium">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── StoriesBar ───────────────────────────────────────────────────────────────

function StoryAvatar({
  src,
  alt,
  live,
  label,
  href,
}: {
  src: string;
  alt: string;
  live?: boolean;
  label: string;
  href: string;
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1.5 flex-shrink-0 select-none">
      <motion.div whileTap={{ scale: 0.92 }} className="relative">
        {/* Pulsing glow ring — only for live */}
        {live && (
          <motion.div
            className="absolute -inset-1 rounded-full bg-orange-500/30"
            animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0.15, 0.6] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <div
          className={`relative w-16 h-16 rounded-full p-[2.5px] ${
            live
              ? 'bg-gradient-to-br from-orange-400 to-orange-600'
              : 'bg-zinc-800'
          }`}
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-zinc-950">
            <img
              src={src}
              alt={alt}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
        {live && (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-px bg-orange-500 text-black text-[9px] font-black uppercase rounded-full">
            Live
          </span>
        )}
      </motion.div>
      <span className="text-[10px] text-zinc-500 truncate w-16 text-center font-medium">
        {label}
      </span>
    </Link>
  );
}

function StoriesBar() {
  return (
    <div className="sticky top-[52px] z-40 bg-black border-b border-zinc-900">
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
        {/* Live header bubble */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            <motion.div
              className="absolute -inset-1 rounded-full bg-orange-500/20"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-[0_0_18px_rgba(249,115,22,0.35)]">
              <Radio size={20} className="text-white" />
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 font-medium">Runs</span>
        </div>

        {LIVE_RUNS.map((run) => (
          <StoryAvatar
            key={run.id}
            src={run.avatar}
            alt={run.name}
            live
            label={run.name}
            href="/runs"
          />
        ))}

        {/* Divider */}
        <div className="w-px bg-zinc-800 self-stretch my-2 flex-shrink-0 mx-1" />

        {/* Trail updates header */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Mountain size={20} className="text-zinc-600" />
          </div>
          <span className="text-[10px] text-zinc-500 font-medium">Trails</span>
        </div>

        {TRAIL_UPDATES.map((trail) => (
          <StoryAvatar
            key={trail.id}
            src={trail.avatar}
            alt={trail.name}
            label={trail.name}
            href="/trails"
          />
        ))}
      </div>
    </div>
  );
}

// ─── RigPostCard ──────────────────────────────────────────────────────────────

function RigPostCard({ post, index }: { post: Post; index: number }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showHeart, setShowHeart] = useState(false);
  const [imgError, setImgError] = useState(false);
  const lastTapRef = useRef(0);

  async function haptic(style: ImpactStyle) {
    try { await Haptics.impact({ style }); } catch {}
  }

  const handleLike = async () => {
    await haptic(ImpactStyle.Medium);
    setLiked((prev) => {
      setLikesCount((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  };

  const handleDoubleTap = async () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      if (!liked) {
        setLiked(true);
        setLikesCount((c) => c + 1);
      }
      setShowHeart(true);
      await haptic(ImpactStyle.Heavy);
      setTimeout(() => setShowHeart(false), 900);
    }
    lastTapRef.current = now;
  };

  const handleSave = async () => {
    await haptic(ImpactStyle.Light);
    setSaved((prev) => !prev);
  };

  const handleShare = async () => {
    await haptic(ImpactStyle.Light);
    const url = typeof window !== 'undefined' ? `${window.location.origin}/posts/${post.id}` : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: `${post.username}'s Rig`, text: post.caption, url }); } catch {}
    } else if (navigator.clipboard) {
      try { await navigator.clipboard.writeText(url); } catch {}
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      className="bg-black"
    >
      {/* ── Card Header ─────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 ring-2 ring-zinc-800 flex-shrink-0">
            {post.avatar_url && !imgError ? (
              <img
                src={post.avatar_url}
                alt={post.username ?? 'User'}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold text-sm">
                {(post.username ?? 'U')[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Name + rig */}
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[13px] text-white leading-none">
                {post.username ?? 'Anonymous'}
              </span>
              {post.verified && (
                <BadgeCheck size={14} className="text-orange-500 flex-shrink-0" />
              )}
            </div>
            {post.rig_name && (
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">{post.rig_name}</p>
            )}
          </div>
        </div>

        <button
          className="p-2 -mr-1 text-zinc-500 hover:text-zinc-300 transition-colors rounded-full"
          aria-label="More options"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* ── Image ────────────────────────────────────── */}
      <div
        className="relative aspect-square bg-zinc-950 w-full overflow-hidden"
        onClick={handleDoubleTap}
      >
        <img
          src={post.image_url}
          alt={post.caption}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
          loading="lazy"
        />

        {/* Double-tap heart burst */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              key="heart-burst"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.38, ease: [0.23, 1, 0.32, 1] }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart
                size={88}
                className="text-orange-500 fill-orange-500 drop-shadow-[0_0_24px_rgba(249,115,22,0.7)]"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Action Bar ───────────────────────────────── */}
      <div className="px-3 pt-2.5 pb-3 bg-black">
        {/* Icons row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 1.35 }}
              transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              onClick={handleLike}
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              <Heart
                size={26}
                className={liked ? 'text-orange-500 fill-orange-500' : 'text-white'}
              />
            </motion.button>
            <motion.button
              whileTap={{ scale: 1.35 }}
              transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              aria-label="Comment"
            >
              <MessageCircle size={26} className="text-white" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 1.35 }}
              transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              onClick={handleShare}
              aria-label="Share"
            >
              <Share2 size={24} className="text-white" />
            </motion.button>
          </div>
          <motion.button
            whileTap={{ scale: 1.35 }}
            transition={{ type: 'spring', stiffness: 500, damping: 14 }}
            onClick={handleSave}
            aria-label={saved ? 'Unsave' : 'Save'}
          >
            <Bookmark
              size={26}
              className={saved ? 'text-orange-500 fill-orange-500' : 'text-white'}
            />
          </motion.button>
        </div>

        {/* Likes count */}
        <p className="font-bold text-[13px] text-white mb-1">
          {likesCount.toLocaleString()} likes
        </p>

        {/* Caption */}
        <p className="text-[13px] text-zinc-300 leading-relaxed">
          <span className="font-bold text-white mr-1">{post.username}</span>
          <Caption text={post.caption} />
        </p>

        {/* Rig specs pill */}
        {post.rig_specs && (
          <p className="text-[11px] text-zinc-500 mt-1.5">
            <span className="text-orange-500/80">{post.rig_specs}</span>
          </p>
        )}

        {/* Footer: comments + timestamp */}
        <div className="flex items-center gap-3 mt-2">
          {post.comments_count > 0 && (
            <button className="text-[12px] text-zinc-500 hover:text-zinc-400 transition-colors">
              View all {post.comments_count} comments
            </button>
          )}
          <span className="text-[11px] text-zinc-600">{timeAgo(post.created_at)}</span>
        </div>
      </div>

      {/* Subtle card separator */}
      <div className="h-px bg-zinc-900" />
    </motion.article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPosts = async () => {
    if (!supabase || !isSupabaseConfigured()) {
      setPosts(PLACEHOLDER_POSTS);
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setPosts(data?.length ? data : PLACEHOLDER_POSTS);
    } catch {
      setPosts(PLACEHOLDER_POSTS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
    await fetchPosts();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  useEffect(() => { fetchPosts(); }, []);

  return (
    <div className="min-h-screen bg-black">

      {/* ── Sticky Top Header ─────────────────────── */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-zinc-900">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="text-black font-black text-[10px] tracking-tight">PO</span>
            </div>
            <span className="font-black text-white text-base tracking-tight">
              Project<span className="text-orange-500">Offroad</span>
            </span>
          </div>

          {/* Refresh */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh feed"
            className="p-2 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={isRefreshing ? 'animate-spin text-orange-500' : ''}
            />
          </motion.button>
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
            <motion.div
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {posts.map((post, i) => (
                <RigPostCard key={post.id} post={post} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── FAB ───────────────────────────────────── */}
      <Link href="/posts/create" aria-label="Create post">
        <motion.span
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="fixed bottom-[88px] right-4 z-40 w-13 h-13 w-[52px] h-[52px] bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 md:hidden"
        >
          <Plus size={22} className="text-black" strokeWidth={2.5} />
        </motion.span>
      </Link>

      {/* ── Disclaimer ─────────────────────────────── */}
      <DisclaimerModal />

      {/* ── Bottom Nav ─────────────────────────────── */}
      <BottomNav />
    </div>
  );
}
