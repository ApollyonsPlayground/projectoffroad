'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Plus, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, RefreshCw, Radio, Mountain } from 'lucide-react';
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
}

// Placeholder posts for when Supabase isn't configured
const placeholderPosts: Post[] = [
  {
    id: '1',
    user_id: '1',
    image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80',
    caption: 'Fresh back from Holcomb Valley. This JK handled the rock gardens like a champ!',
    rig_name: '2018 Jeep Wrangler JK',
    rig_specs: '37" KO2s, 4" lift, winch',
    likes_count: 47,
    comments_count: 12,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    username: 'TrailBlazer_Mike',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
  },
  {
    id: '2',
    user_id: '2',
    image_url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80',
    caption: 'Desert vibes at Johnson Valley OHV. Perfect weather for some dune runs.',
    rig_name: '2020 Ford Raptor',
    rig_specs: 'Stock + skid plates',
    likes_count: 89,
    comments_count: 23,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    username: 'DesertRunner_Sarah',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
  },
  {
    id: '3',
    user_id: '3',
    image_url: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80',
    caption: 'Installed the new bumper setup this weekend. Ready for the Big Bear run next Saturday!',
    rig_name: '2016 Toyota Tacoma TRD',
    rig_specs: '33" Falken, roof rack, RTT',
    likes_count: 124,
    comments_count: 31,
    created_at: new Date(Date.now() - 14400000).toISOString(),
    username: 'TacoTuesday_Dan',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80',
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
    <div className="border-b border-zinc-800 py-4 overflow-hidden">
      <div className="flex gap-4 px-4 overflow-x-auto scrollbar-hide">
        {/* Live Runs Section */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-500 p-0.5">
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center">
                <Radio size={24} className="text-orange-500" />
              </div>
            </div>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold uppercase rounded">Live</span>
          </div>
          <span className="text-xs text-zinc-400 truncate w-16 text-center">Live Runs</span>
        </div>

        {/* Live Run Stories */}
        {liveRuns.map((run) => (
          <Link key={run.id} href="/runs" className="flex flex-col items-center gap-1 flex-shrink-0">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-orange-500 p-0.5 animate-pulse">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img src={run.avatar} alt={run.name} className="w-full h-full object-cover" />
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-red-500 border-2 border-zinc-900 rounded-full flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              </span>
            </motion.div>
            <span className="text-xs text-zinc-400 truncate w-16 text-center">{run.name}</span>
          </Link>
        ))}

        {/* Divider */}
        <div className="w-px bg-zinc-800 flex-shrink-0 mx-1" />

        {/* Trail Updates Section */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 p-0.5">
            <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center">
              <Mountain size={24} className="text-emerald-500" />
            </div>
          </div>
          <span className="text-xs text-zinc-400 truncate w-16 text-center">Updates</span>
        </div>

        {/* Trail Update Stories */}
        {trailUpdates.map((trail) => (
          <Link key={trail.id} href="/trails" className="flex flex-col items-center gap-1 flex-shrink-0">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 p-0.5"
            >
              <div className="w-full h-full rounded-full overflow-hidden">
                <img src={trail.avatar} alt={trail.name} className="w-full h-full object-cover" />
              </div>
            </motion.div>
            <span className="text-xs text-zinc-400 truncate w-16 text-center">{trail.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function RigPostCard({ post, index }: { post: Post; index: number }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [commentsCount] = useState(post.comments_count);
  const [showCommentHint, setShowCommentHint] = useState(false);

  const handleLike = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {}
    
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
  };

  const handleSave = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {}
    setSaved(!saved);
  };

  const handleComment = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {}
    setShowCommentHint(true);
    setTimeout(() => setShowCommentHint(false), 1500);
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
      } catch (err) {
        // User cancelled or share failed - silently handle
      }
    } else {
      // Fallback: copy to clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(shareData.url);
        } catch (e) {}
      }
    }
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-zinc-900 border border-zinc-800"
    >
      {/* Post Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden ring-2 ring-orange-500/50">
            {post.avatar_url ? (
              <img
                src={post.avatar_url}
                alt={post.username || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold">
                {(post.username || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-sm text-white">{post.username || 'Anonymous'}</p>
            {post.rig_name && (
              <p className="text-xs text-zinc-500">{post.rig_name}</p>
            )}
          </div>
        </div>
        <button className="p-2 text-zinc-500 hover:text-white transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Post Image */}
      <div className="aspect-square bg-zinc-800 relative">
        <img
          src={post.image_url}
          alt={post.caption}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 1.3 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              onClick={handleLike}
              className={`transition-colors ${liked ? 'text-orange-500' : 'text-zinc-400 hover:text-white'}`}
              aria-label={liked ? 'Unlike post' : 'Like post'}
            >
              <Heart
                size={24}
                className={liked ? 'fill-orange-500' : ''}
              />
            </motion.button>
            <div className="relative">
              <motion.button
                whileTap={{ scale: 1.3 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                onClick={handleComment}
                className="text-zinc-400 hover:text-white transition-colors"
                aria-label="Comment on post"
              >
                <MessageCircle size={24} />
              </motion.button>
              <AnimatePresence>
                {showCommentHint && (
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-orange-500 whitespace-nowrap bg-zinc-900 px-2 py-1 rounded"
                  >
                    Coming soon
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <motion.button
              whileTap={{ scale: 1.3 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              onClick={handleShare}
              className="text-zinc-400 hover:text-white transition-colors"
              aria-label="Share post"
            >
              <Share2 size={24} />
            </motion.button>
          </div>
          <motion.button
            whileTap={{ scale: 1.3 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            onClick={handleSave}
            className={`transition-colors ${saved ? 'text-orange-500' : 'text-zinc-400 hover:text-white'}`}
            aria-label={saved ? 'Unsave post' : 'Save post'}
          >
            <Bookmark
              size={24}
              className={saved ? 'fill-orange-500' : ''}
            />
          </motion.button>
        </div>

        {/* Likes Count */}
        <p className="font-semibold text-sm text-white mb-2">
          {likesCount.toLocaleString()} likes
        </p>

        {/* Caption */}
        <p className="text-sm text-zinc-300 mb-1">
          <span className="font-semibold text-white">{post.username} </span>
          {post.caption}
        </p>

        {/* Rig Specs Tag */}
        {post.rig_specs && (
          <p className="text-xs text-orange-500 mt-2">
            Build: {post.rig_specs}
          </p>
        )}

        {/* Comments Link */}
        {post.comments_count > 0 && (
          <button className="text-sm text-zinc-500 mt-2 hover:text-zinc-400 transition-colors">
            View all {post.comments_count} comments
          </button>
        )}

        {/* Timestamp */}
        <p className="text-xs text-zinc-600 mt-2 uppercase tracking-wide">
          {timeAgo(post.created_at)}
        </p>
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
    <div className="min-h-screen bg-background">
      {/* Safety Disclaimer Header */}
      <header className="sticky top-0 z-50 glass border-b border-zinc-800 safe-top">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-orange-500" />
            <span className="text-xs font-semibold text-orange-500 uppercase tracking-wider">
              Off-roading involves risk
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
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
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto pt-14 pb-24">
        {/* App Title */}
        <div className="px-4 py-4 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            SoCal Off-Roaders
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Southern California&apos;s Off-Road Community
          </p>
        </div>

        {/* Stories Bar */}
        <StoriesBar />

        {/* Feed */}
        <div className="divide-y divide-zinc-800">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                <FeedSkeleton count={3} />
              </motion.div>
            ) : (
              <motion.div
                key="posts"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
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
