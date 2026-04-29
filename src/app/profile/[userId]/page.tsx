'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Grid3X3, Bookmark, MessageCircle, BadgeCheck, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';

type Tab = 'posts' | 'favorites' | 'comments';

interface PostRow {
  id: string;
  image_url?: string;
  body?: string;
  created_at: string;
}

interface CommentRow {
  id: string;
  body: string;
  created_at: string;
  posts?: { id: string; body?: string; user_name?: string } | null;
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params?.userId as string;
  const { supabaseClient } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [favorites, setFavorites] = useState<PostRow[]>([]);
  const [commentsList, setCommentsList] = useState<CommentRow[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Fetch profile
  useEffect(() => {
    if (!userId) { setError('Invalid user ID'); setIsLoading(false); return; }
    const client = supabaseClient;
    if (!client) { setError('Not connected'); setIsLoading(false); return; }

    client
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

  // Fetch tab data
  const fetchTab = useCallback(async (tab: Tab) => {
    if (!supabaseClient || !userId) return;
    setTabLoading(true);
    try {
      if (tab === 'posts') {
        const { data } = await supabaseClient
          .from('posts')
          .select('id, image_url, body, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30);
        setPosts((data as PostRow[]) ?? []);
      } else if (tab === 'favorites') {
        const { data } = await supabaseClient
          .from('saved_posts')
          .select('post_id, posts(id, image_url, body, created_at)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30);
        const flat = (data ?? []).map((r: any) => r.posts).filter(Boolean) as PostRow[];
        setFavorites(flat);
      } else if (tab === 'comments') {
        const { data } = await supabaseClient
          .from('comments')
          .select('id, body, created_at, posts(id, body, user_name)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30);
        setCommentsList((data as CommentRow[]) ?? []);
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
    { id: 'posts', label: 'Posts', icon: Grid3X3 },
    { id: 'favorites', label: 'Favorites', icon: Bookmark },
    { id: 'comments', label: 'Comments', icon: MessageCircle },
  ];

  const currentData = activeTab === 'posts' ? posts : activeTab === 'favorites' ? favorites : commentsList;

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
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-semibold transition-colors border-b-2 ${
                activeTab === id
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-md mx-auto px-4 pt-4">
        {tabLoading ? (
          <div className="flex justify-center pt-10">
            <Loader2 size={22} className="animate-spin text-zinc-600" />
          </div>
        ) : currentData.length === 0 ? (
          <div className="text-center pt-12">
            <p className="text-zinc-600 text-[14px]">
              {activeTab === 'posts' ? 'No posts yet.' : activeTab === 'favorites' ? 'No saved posts yet.' : 'No comments yet.'}
            </p>
          </div>
        ) : activeTab === 'comments' ? (
          <div className="space-y-3">
            {(currentData as CommentRow[]).map((c) => (
              <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                {c.posts && (
                  <p className="text-zinc-600 text-[11px] mb-1 truncate">
                    On: {c.posts.user_name ? `${c.posts.user_name}'s post` : 'a post'}
                  </p>
                )}
                <p className="text-white text-[13px] leading-relaxed">{c.body}</p>
                <p className="text-zinc-600 text-[11px] mt-1">{timeAgo(c.created_at)}</p>
              </div>
            ))}
          </div>
        ) : (
          /* Posts / Favorites grid */
          <div className="grid grid-cols-3 gap-0.5">
            {(currentData as PostRow[]).map((p) => (
              <div key={p.id} className="aspect-square bg-zinc-900 overflow-hidden relative">
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <p className="text-zinc-500 text-[10px] text-center leading-tight line-clamp-4">{p.body}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
