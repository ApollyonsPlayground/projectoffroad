'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Grid3X3, Bookmark, Heart, Repeat2, BadgeCheck, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';

type Tab = 'posts' | 'reposts' | 'liked' | 'favorites';

interface PostRow {
  id: string;
  image_url?: string;
  body?: string;
  created_at: string;
  repost_of_id?: string | null;
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

function PostGrid({ posts }: { posts: PostRow[] }) {
  if (posts.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {posts.map((p) => (
        <div key={p.id} className="aspect-square bg-zinc-900 overflow-hidden relative">
          {p.image_url ? (
            <img src={p.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-2">
              <p className="text-zinc-500 text-[10px] text-center leading-tight line-clamp-4">{p.body}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params?.userId as string;
  const { supabaseClient } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [myPosts, setMyPosts] = useState<PostRow[]>([]);
  const [reposts, setReposts] = useState<PostRow[]>([]);
  const [liked, setLiked] = useState<PostRow[]>([]);
  const [favorites, setFavorites] = useState<PostRow[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

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

  const fetchTab = useCallback(async (tab: Tab) => {
    if (!supabaseClient || !userId) return;
    setTabLoading(true);
    try {
      if (tab === 'posts') {
        const { data } = await supabaseClient
          .from('posts')
          .select('id, image_url, body, created_at, repost_of_id, user_name, role')
          .eq('user_id', userId)
          .is('repost_of_id', null)
          .order('created_at', { ascending: false })
          .limit(30);
        setMyPosts((data as PostRow[]) ?? []);
      } else if (tab === 'reposts') {
        const { data } = await supabaseClient
          .from('posts')
          .select('id, image_url, body, created_at, repost_of_id, user_name, role')
          .eq('user_id', userId)
          .not('repost_of_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(30);
        setReposts((data as PostRow[]) ?? []);
      } else if (tab === 'liked') {
        const { data } = await supabaseClient
          .from('post_likes')
          .select('posts(id, image_url, body, created_at, repost_of_id)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30);
        const flat = (data ?? []).map((r: any) => r.posts).filter(Boolean) as PostRow[];
        setLiked(flat);
      } else if (tab === 'favorites') {
        const { data } = await supabaseClient
          .from('saved_posts')
          .select('posts(id, image_url, body, created_at, repost_of_id)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30);
        const flat = (data ?? []).map((r: any) => r.posts).filter(Boolean) as PostRow[];
        setFavorites(flat);
      }
    } finally {
      setTabLoading(false);
    }
  }, [supabaseClient, userId]);

  useEffect(() => {
    if (!isLoading && !error) fetchTab(activeTab);
  }, [activeTab, isLoading, error, fetchTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-zinc-600" />
        <BottomNav />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 gap-6">
        <h2 className="text-[22px] font-black text-white">Profile Not Found</h2>
        <p className="text-zinc-500 text-[14px]">{error ?? 'This user does not exist.'}</p>
        <Link href="/" className="px-5 py-3 bg-orange-500 text-black font-bold rounded-xl text-[14px]">
          Back to Feed
        </Link>
        <BottomNav />
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: any }[] = [
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

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-zinc-900 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-900 transition-colors">
          <ArrowLeft size={19} className="text-white" />
        </Link>
        <span className="text-[17px] font-black text-white leading-none">{profile.name ?? 'Profile'}</span>
      </div>

      {/* Profile header */}
      <div className="max-w-md mx-auto px-4 pt-6 pb-4 flex flex-col items-center text-center gap-3">
        <div className="relative">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name ?? 'Avatar'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 font-black text-2xl">
                {(profile.name ?? 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
          {profile.role === 'owner' && (
            <span className="absolute -bottom-1 -right-1 w-[22px] h-[22px] rounded-full bg-[#FF8C00] flex items-center justify-center">
              <span className="text-[8px] font-black text-black leading-none">PO</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <h1 className="text-[20px] font-black text-white leading-none">{profile.name ?? 'Anonymous'}</h1>
          {profile.is_verified && <BadgeCheck size={17} className="text-orange-500 flex-shrink-0" />}
        </div>

        {profile.bio && (
          <p className="text-zinc-400 text-[13px] leading-relaxed max-w-[260px]">{profile.bio}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="max-w-md mx-auto border-b border-zinc-800">
        <div className="flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1 py-3 text-[12px] font-semibold transition-colors border-b-2 ${
                activeTab === id
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-md mx-auto pt-1">
        {tabLoading ? (
          <div className="flex justify-center pt-10">
            <Loader2 size={22} className="animate-spin text-zinc-600" />
          </div>
        ) : currentData.length === 0 ? (
          <div className="text-center pt-12">
            <p className="text-zinc-600 text-[14px]">{emptyMessages[activeTab]}</p>
          </div>
        ) : (
          <PostGrid posts={currentData} />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
