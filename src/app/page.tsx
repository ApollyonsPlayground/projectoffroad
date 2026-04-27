'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Plus, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, RefreshCw, Radio, Mountain, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import BottomNav from '@/components/BottomNav';
import { FeedSkeleton } from '@/components/SkeletonLoader';
import DisclaimerModal from '@/components/DisclaimerModal';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

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

// Placeholder posts for when Supabase isn't configured
const placeholderPosts: Post[] = [
  {
    id: '1',
    user_id: '1',
    image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80',
    caption: 'Fresh back from Holcomb Valley. This JK handled the rock gardens like a champ! #JeepLife #HolcombValley #SoCalOffroad',
    rig_name: '2018 Jeep Wrangler JK',
    rig_specs: '37" KO2s, 4" lift, winch',
    likes_count: 47,
    comments_count: 12,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    username: 'TrailBlazer_Mike',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
    verified: true,
  },
  {
    id: '2',
    user_id: '2',
    image_url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80',
    caption: 'Desert vibes at Johnson Valley OHV. Perfect weather for some dune runs. #DesertLife #Raptor #JohnsonValley',
    rig_name: '2020 Ford Raptor',
    rig_specs: 'Stock + skid plates',
    likes_count: 89,
    comments_count: 23,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    username: 'DesertRunner_Sarah',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
    verified: true,
  },
  {
    id: '3',
    user_id: '3',
    image_url: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80',
    caption: 'Installed the new bumper setup this weekend. Ready for the Big Bear run next Saturday! #TacomaLife #BigBear #BuildThread',
    rig_name: '2016 Toyota Tacoma TRD',
    rig_specs: '33" Falken, roof rack, RTT',
    likes_count: 124,
    comments_count: 31,
    created_at: new Date(Date.now() - 14400000).toISOString(),
    username: 'TacoTuesday_Dan',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80',
    verified: false,
  },
];

// Stories data
const liveRuns = [
  { id: '1', name: 'Big Bear', avatar: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=100&q=80', isLive: true },
  { id: '2', name: 'Johnson Valley', avatar: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=100&q=80', isLive: true },
  { id: '3', name: 'Holcomb Creek', avatar: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=100&q=80', isLive: true },
];

const trailUpdates = [
  { id: '1', name: 'Cleghorn', avatar: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=100&q=80', type: 'update' },
  { id: '2', name: 'Corral Canyon', avatar: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=100&q=80', type: 'update' },
  { id: '3', name: 'Miller Jeep', avatar: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=100&q=80', type: 'update' },
  { id: '4', name: 'Burns Canyon', avatar: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=100&q=80', type: 'update' },
];

function StoriesBar() {
  return (
    <div className="sticky top-[52px] z-40 bg-black/95 backdrop-blur-sm border-b border-zinc-900 py-3 overflow-hidden">
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide">
        {/* Live Runs Section */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            {/* Pulsing outer glow for Live */}
            <div className="absolute inset-0 rounded-full bg-orange-500/30 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative w-[68px] h-[68px] rounded-full bg-gradient-to-br from-orange-500 to-orange-600 p-[2px] shadow-[0_0_20px_rgba(249,115,22,0.4)]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                <Radio size={22} className="text-orange-500" />
              </div>
            </div>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-orange-500 text-black text-[9px] font-bold uppercase rounded-full">Live</span>
          </div>
          <span className="text-[10px] text-zinc-500 truncate w-[68px] text-center font-medium">Live Runs</span>
        </div>

        {/* Live Run Stories - Orange ring with glow */}
        {liveRuns.map((run) => (
          <Link key={run.id} href="/runs" className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              {/* Slow pulsing glow */}
              <motion.div 
                className="absolute inset-0 rounded-full bg-orange-500/20"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="relative w-[68px] h-[68px] rounded-full bg-gradient-to-br from-orange-500 to-orange-600 p-[2px] shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                <div className="w-full h-full rounded-full overflow-hidden bg-black p-[2px]">
                  <img src={run.avatar} alt={run.name} className="w-full h-full object-cover rounded-full" />
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-orange-500 border-2 border-black rounded-full flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              </span>
            </motion.div>
            <span className="text-[10px] text-zinc-500 truncate w-[68px] text-center font-medium">{run.name}</span>
          </Link>
        ))}

        {/* Divider */}
        <div className="w-px bg-zinc-800/50 flex-shrink-0 mx-1 my-3" />

        {/* Trail Updates Section */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="w-[68px] h-[68px] rounded-full bg-zinc-800/50 p-[2px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <Mountain size={22} className="text-zinc-600" />
            </div>
          </div>
          <span className="text-[10px] text-zinc-500 truncate w-[68px] text-center font-medium">Updates</span>
        </div>

        {/* Trail Update Stories - Subtle ring (not live) */}
        {trailUpdates.map((trail) => (
          <Link key={trail.id} href="/trails" className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="w-[68px] h-[68px] rounded-full bg-zinc-800/50 p-[2px]"
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-black p-[2px]">
                <img src={trail.avatar} alt={trail.name} className="w-full h-full object-cover rounded-full" />
              </div>
            </motion.div>
            <span className="text-[10px] text-zinc-500 truncate w-[68px] text-center font-medium">{trail.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Helper to render caption with orange hashtags
function renderCaption(caption: string) {
  const parts = caption.split(/(#\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return <span key={i} className="text-orange-500 font-medium">{part}</span>;
    }
    return part;
  });
}

function RigPostCard({ post, index }: { post: Post; index: number }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  const handleLike = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {}
    
    if (!liked) {
      setLiked(true);
      setLikesCount(likesCount + 1);
    } else {
      setLiked(false);
      setLikesCount(likesCount - 1);
    }
  };

  // Double-tap to like with heart animation
  const handleDoubleTap = async () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Double tap detected
      if (!liked) {
        setLiked(true);
        setLikesCount(likesCount + 1);
      }
      setShowHeartAnimation(true);
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (e) {}
      setTimeout(() => setShowHeartAnimation(false), 1000);
    }
    setLastTap(now);
  };

  const handleSave = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {}
    setSaved(!saved);
  };

  const handleShare = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {}
    
    const shareData = {
      title: `${post.username}'s Rig`,
      text: post.caption,
      url: typeof window !== 'undefined' ? `${window.location.origin}/posts/${post.id}` : '',
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {}
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareData.url);
      } catch (e) {}
    }
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.08 }}
      className="relative"
    >
      {/* Full-Bleed Image Container */}
      <div 
        className="relative aspect-[4/5] bg-black cursor-pointer select-none"
        onClick={handleDoubleTap}
      >
        <img
          src={post.image_url}
          alt={post.caption}
          className="w-full h-full object-cover"
          draggable={false}
        />
        
        {/* Top Gradient with User Info Overlay */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 via-black/30 to-transparent">
          <div className="flex items-center justify-between px-4 pt-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/20">
                {post.avatar_url ? (
                  <img
                    src={post.avatar_url}
                    alt={post.username || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold text-sm">
                    {(post.username || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-white drop-shadow-lg">{post.username || 'Anonymous'}</span>
                {post.verified && (
                  <BadgeCheck size={16} className="text-orange-500 fill-orange-500/20" />
                )}
              </div>
            </div>
            <button className="p-1.5 text-white/80 hover:text-white transition-colors">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* Double-tap Heart Animation */}
        <AnimatePresence>
          {showHeartAnimation && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart size={100} className="text-orange-500 fill-orange-500 drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions Bar */}
      <div className="px-4 py-3 bg-black">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-5">
            <motion.button
              whileTap={{ scale: 1.4 }}
              transition={{ type: 'spring', stiffness: 600, damping: 12 }}
              onClick={handleLike}
              className={`transition-colors ${liked ? 'text-orange-500' : 'text-white'}`}
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              <Heart size={26} className={liked ? 'fill-orange-500' : ''} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 1.4 }}
              transition={{ type: 'spring', stiffness: 600, damping: 12 }}
              className="text-white"
              aria-label="Comment"
            >
              <MessageCircle size={26} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 1.4 }}
              transition={{ type: 'spring', stiffness: 600, damping: 12 }}
              onClick={handleShare}
              className="text-white"
              aria-label="Share"
            >
              <Share2 size={24} />
            </motion.button>
          </div>
          <motion.button
            whileTap={{ scale: 1.4 }}
            transition={{ type: 'spring', stiffness: 600, damping: 12 }}
            onClick={handleSave}
            className={`transition-colors ${saved ? 'text-orange-500' : 'text-white'}`}
            aria-label={saved ? 'Unsave' : 'Save'}
          >
            <Bookmark size={26} className={saved ? 'fill-orange-500' : ''} />
          </motion.button>
        </div>

        {/* Likes */}
        <p className="font-bold text-sm text-white mb-1.5">
          {likesCount.toLocaleString()} likes
        </p>

        {/* Caption with Hashtags */}
        <p className="text-sm text-zinc-300 leading-relaxed">
          <span className="font-bold text-white">{post.username}</span>{' '}
          {renderCaption(post.caption)}
        </p>

        {/* Rig Info */}
        {post.rig_name && (
          <p className="text-xs text-zinc-500 mt-1.5">
            {post.rig_name} {post.rig_specs && <span className="text-orange-500/80">• {post.rig_specs}</span>}
          </p>
        )}

        {/* Comments & Time */}
        <div className="flex items-center gap-2 mt-2">
          {post.comments_count > 0 && (
            <button className="text-xs text-zinc-500 hover:text-zinc-400">
              View all {post.comments_count} comments
            </button>
          )}
          <span className="text-xs text-zinc-600">{timeAgo(post.created_at)}</span>
        </div>
      </div>
    </motion.article>
  );
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPosts = async () => {
    if (!supabase || !isSupabaseConfigured()) {
      // Use placeholder data if Supabase isn't configured
      setPosts(placeholderPosts);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('is_flagged', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts(data?.length ? data : placeholderPosts);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setPosts(placeholderPosts);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {}
    await fetchPosts();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Minimal Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-zinc-900 safe-top">
        <div className="flex items-center justify-between px-4 py-2.5 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
              <span className="text-black font-black text-xs">SC</span>
            </div>
            <span className="text-sm font-bold text-white tracking-tight">
              SoCal Off-Roaders
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-500/10">
              <AlertTriangle size={12} className="text-orange-500" />
              <span className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide">
                Ride Safe
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <RefreshCw
                size={18}
                className={isRefreshing ? 'animate-spin text-orange-500' : ''}
              />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto pb-24 bg-black">
        {/* Stories Bar - Sticky */}
        <StoriesBar />

        {/* Feed - Full Bleed */}
        <div className="bg-black">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-4 py-4"
              >
                <FeedSkeleton count={3} />
              </motion.div>
            ) : (
              <motion.div
                key="posts"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-1"
              >
                {posts.map((post, index) => (
                  <RigPostCard key={post.id} post={post} index={index} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Action Button */}
      <Link href="/posts/create">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/25 md:hidden"
        >
          <Plus size={24} className="text-zinc-950" />
        </motion.button>
      </Link>

      {/* Disclaimer Modal */}
      <DisclaimerModal />

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
