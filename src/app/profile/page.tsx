'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  MapPin,
  BadgeCheck,
  Truck,
  Shield,
  Settings,
  LogOut,
  ChevronRight,
  Plus,
  Edit2,
  Camera,
  Award,
  Calendar,
  Heart,
  X,
  Save,
  Loader2,
  Grid3X3,
  Repeat2,
  Bookmark,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { FollowListDrawer, type FollowListMode } from '@/components/FollowListDrawer';
import { ProfileThemeSwatches } from '@/components/ProfileThemeSwatches';
import { ProfileSkeleton } from '@/components/SkeletonLoader';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { resolveOwnProfileDisplayName } from '@/lib/profileDisplay';
import { supabase } from '@/lib/db/supabase';
import {
  fetchLikedPostIdsRecent,
  fetchPostsByIds,
  fetchSavedPostIdsRecent,
} from '@/lib/supabase/resilientSocial';
import { ensureStoragePublicObjectUrl } from '@/lib/supabase/storagePublicUrl';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  modifications?: string;
  is_primary: boolean;
}

interface ProfileRunRow {
  id: string;
  title: string;
  date: string;
  status: string;
  role: 'hosting' | 'joined';
}

type TabId = 'posts' | 'reposts' | 'liked' | 'favorites';

interface Post {
  id: string;
  image_url?: string;
  body?: string;
  caption: string;
  likes_count: number;
  created_at: string;
  repost_of_id?: string | null;
}

function normalizeProfilePost(p: Record<string, unknown>): Post {
  const text = String(p.body ?? p.content ?? p.caption ?? '');
  const rawImg = (p.image_url as string) ?? undefined;
  return {
    id: String(p.id),
    image_url: rawImg
      ? ensureStoragePublicObjectUrl(rawImg) || rawImg
      : undefined,
    body: text,
    caption: String(p.caption ?? text),
    likes_count: Number(p.likes_count ?? p.likes ?? 0),
    created_at: String(p.created_at ?? ''),
    repost_of_id: (p.repost_of_id as string | null | undefined) ?? null,
  };
}

// ─── Placeholder data (shown when Supabase is not configured) ─────────────────

const PLACEHOLDER_PROFILE = {
  name: 'Trail Rider',
  email: 'rider@example.com',
  avatar_url: null as string | null,
  bio: 'Off-road enthusiast exploring SoCal trails. Always chasing the next adventure.',
  location: 'San Bernardino, CA',
  experience_level: 'Intermediate',
  runs_completed: 14,
  trails_visited: 27,
  posts_count: 9,
  is_verified: true,
  role: 'user' as string,
};

const PLACEHOLDER_VEHICLES: Vehicle[] = [
  {
    id: '1',
    year: 2018,
    make: 'Jeep',
    model: 'Wrangler',
    trim: 'JK Rubicon',
    modifications: '37" BFG KO2s, 4" TeraFlex lift, Warn winch, rock sliders, skid plates',
    is_primary: true,
  },
];

// ─── Edit Rig Modal ────────────────────────────────────────────────────────────

function EditRigModal({
  vehicle,
  onClose,
  onSaved,
}: {
  vehicle: Vehicle | null;
  onClose: () => void;
  onSaved: (v: Vehicle) => void;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isNew = vehicle === null;

  const [form, setForm] = useState<Omit<Vehicle, 'id' | 'is_primary'>>({
    year: vehicle?.year ?? new Date().getFullYear(),
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    trim: vehicle?.trim ?? '',
    modifications: vehicle?.modifications ?? '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSave = async () => {
    if (!form.make.trim() || !form.model.trim()) {
      showToast('Make and model are required', 'error');
      return;
    }

    setSaving(true);
    try {
      if (supabase && user) {
        if (isNew) {
          const { data, error } = await supabase
            .from('vehicles')
            .insert({ ...form, user_id: user.id, is_primary: false })
            .select()
            .single();
          if (error) throw error;
          onSaved(data as Vehicle);
        } else {
          const { data, error } = await supabase
            .from('vehicles')
            .update({ ...form })
            .eq('id', vehicle!.id)
            .select()
            .single();
          if (error) throw error;
          onSaved(data as Vehicle);
        }
        showToast(isNew ? 'Rig added to your garage' : 'Rig specs updated', 'success');
      } else {
        // Demo mode — just update locally
        onSaved({ ...form, id: vehicle?.id ?? Date.now().toString(), is_primary: vehicle?.is_primary ?? false });
        showToast(isNew ? 'Rig added (demo mode)' : 'Rig updated (demo mode)', 'info');
      }
      onClose();
    } catch {
      showToast('Failed to save. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof typeof form, type: 'text' | 'number' = 'text') => (
    <div>
      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm((p) => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        className="w-full bg-card border border-border focus:border-primary/60 rounded-xl px-3 py-2.5 text-[14px] text-foreground/90 placeholder:text-muted-foreground outline-none transition-colors"
      />
    </div>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9992] bg-background/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        className="fixed bottom-0 left-0 right-0 z-[9993] max-w-app-shell mx-auto bg-muted border border-border rounded-t-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div className="w-9 h-1 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
          <span className="font-bold text-foreground text-[15px]">
            {isNew ? 'Add Rig' : 'Edit Rig'}
          </span>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-bold text-[13px] rounded-full transition-colors min-w-[68px] justify-center"
          >
            {saving
              ? <Loader2 size={14} className="animate-spin" />
              : <><Save size={13} strokeWidth={2.5} /> Save</>
            }
          </motion.button>
        </div>

        {/* Form */}
        <div className="px-4 py-4 space-y-3.5 overflow-y-auto max-h-[65dvh]">
          {field('Year', 'year', 'number')}
          {field('Make', 'make')}
          {field('Model', 'model')}
          {field('Trim', 'trim')}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Modifications</label>
            <textarea
              rows={3}
              value={form.modifications}
              onChange={(e) => setForm((p) => ({ ...p, modifications: e.target.value }))}
              placeholder="Lift kit, tires, armor, recovery gear..."
              className="w-full bg-card border border-border focus:border-primary/60 rounded-xl px-3 py-2.5 text-[14px] text-foreground/90 placeholder:text-muted-foreground outline-none resize-none transition-colors"
            />
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, profile, loading, signOut, isConfigured, supabaseClient, refreshProfile } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null | undefined>(undefined);

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);

  // 4-tab content state
  const [activeTab, setActiveTab] = useState<TabId>('posts');
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [reposts, setReposts] = useState<Post[]>([]);
  const [liked, setLiked] = useState<Post[]>([]);
  const [favorites, setFavorites] = useState<Post[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const [myRuns, setMyRuns] = useState<ProfileRunRow[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  const [postsCount, setPostsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [clubsCount, setClubsCount] = useState(0);
  const [runsJoinedCount, setRunsJoinedCount] = useState(0);
  const [followListMode, setFollowListMode] = useState<FollowListMode | null>(null);

  // Cast profile (Record<string,unknown>) to a typed shape for safe rendering
  type DisplayProfile = typeof PLACEHOLDER_PROFILE & {
    avatar_url?: string | null;
    username?: string | null;
    hide_display_name?: boolean | null;
  };
  const displayProfile: DisplayProfile = (profile as DisplayProfile | null) || PLACEHOLDER_PROFILE;

  const displayName = resolveOwnProfileDisplayName({
    id: user?.id,
    name: displayProfile.name as string | undefined,
    username: displayProfile.username as string | undefined,
    hide_display_name: displayProfile.hide_display_name as boolean | undefined,
    email: user?.email ?? (displayProfile.email as string | undefined) ?? null,
  });

  // Fetch vehicles only (tab data handled separately)
  const fetchData = useCallback(async () => {
    if (!supabaseClient || !user) {
      setVehicles(PLACEHOLDER_VEHICLES);
      setIsLoading(false);
      return;
    }
    try {
      setFetchError(false);
      const { data, error } = await supabaseClient
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      setVehicles(data ?? []);
    } catch {
      setFetchError(true);
      setVehicles([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabaseClient]);

  // Fetch data for a single tab
  const fetchTab = useCallback(async (tab: TabId) => {
    if (!supabaseClient || !user) return;
    setTabLoading(true);
    try {
      if (tab === 'posts') {
        const { data, error } = await supabaseClient
          .from('posts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(60);
        if (error) setMyPosts([]);
        else {
          const rows = ((data ?? []) as Record<string, unknown>[]).filter((p) => !p.repost_of_id).slice(0, 30);
          setMyPosts(rows.map(normalizeProfilePost));
        }
      } else if (tab === 'reposts') {
        const { data, error } = await supabaseClient
          .from('posts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(60);
        if (error) setReposts([]);
        else {
          const rows = ((data ?? []) as Record<string, unknown>[]).filter((p) => !!p.repost_of_id).slice(0, 30);
          setReposts(rows.map(normalizeProfilePost));
        }
      } else if (tab === 'liked') {
        const ids = await fetchLikedPostIdsRecent(supabaseClient, user.id, 30);
        const posts = await fetchPostsByIds(supabaseClient, ids);
        const order = new Map(ids.map((id, i) => [id, i]));
        posts.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        setLiked(posts.map((p) => normalizeProfilePost(p as Record<string, unknown>)));
      } else if (tab === 'favorites') {
        const ids = await fetchSavedPostIdsRecent(supabaseClient, user.id, 30);
        const posts = await fetchPostsByIds(supabaseClient, ids);
        const order = new Map(ids.map((id, i) => [id, i]));
        posts.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        setFavorites(posts.map((p) => normalizeProfilePost(p as Record<string, unknown>)));
      }
    } finally {
      setTabLoading(false);
    }
  }, [user, supabaseClient]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !supabaseClient) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Avatar must be under 5 MB', 'error');
      return;
    }
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: dbError } = await supabaseClient
        .from('users')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);
      if (dbError) throw dbError;
      // Keep JWT user_metadata in sync so fallbacks (feed, run chat, etc.) don’t show Google’s old picture.
      const { error: authErr } = await supabaseClient.auth.updateUser({
        data: { avatar_url: urlData.publicUrl },
      });
      if (authErr) console.warn('[profile] auth.updateUser avatar:', authErr.message);
      setLocalAvatarUrl(publicUrl);
      // Refresh the AuthContext profile so the new avatar propagates app-wide
      // without requiring a manual page reload.
      await refreshProfile();
      showToast('Avatar updated!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      showToast(msg, 'error');
    } finally {
      setAvatarUploading(false);
      // Reset so the same file can be picked again
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }, [user, supabaseClient, showToast, refreshProfile]);

  useEffect(() => {
    if (!loading) fetchData();
  }, [loading, fetchData]);

  useEffect(() => {
    if (!supabaseClient || !user) {
      setPostsCount(0);
      setFollowersCount(0);
      setFollowingCount(0);
      setClubsCount(0);
      setRunsJoinedCount(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      const uid = user.id;
      try {
        const [postsRes, folRes, ingRes, clubRes, runRes] = await Promise.all([
          supabaseClient
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', uid)
            .is('repost_of_id', null),
          supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', uid),
          supabaseClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', uid),
          supabaseClient.from('club_members').select('*', { count: 'exact', head: true }).eq('user_id', uid),
          supabaseClient.from('run_participants').select('*', { count: 'exact', head: true }).eq('user_id', uid),
        ]);
        if (cancelled) return;
        setPostsCount(postsRes.count ?? 0);
        setFollowersCount(folRes.count ?? 0);
        setFollowingCount(ingRes.count ?? 0);
        setClubsCount(clubRes.count ?? 0);
        setRunsJoinedCount(runRes.count ?? 0);
      } catch {
        if (!cancelled) {
          setPostsCount(0);
          setFollowersCount(0);
          setFollowingCount(0);
          setClubsCount(0);
          setRunsJoinedCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseClient, user]);

  useEffect(() => {
    if (!isLoading) fetchTab(activeTab);
  }, [activeTab, isLoading, fetchTab]);

  useEffect(() => {
    if (!supabaseClient || !user || loading || isLoading) return;
    let cancelled = false;
    setRunsLoading(true);
    const statuses = ['upcoming', 'active', 'completed'];
    void (async () => {
      try {
        const [hostedRes, partsRes] = await Promise.all([
          supabaseClient
            .from('runs')
            .select('id, title, date, status')
            .eq('host_id', user.id)
            .in('status', statuses)
            .order('date', { ascending: false })
            .limit(24),
          supabaseClient.from('run_participants').select('run_id').eq('user_id', user.id).limit(80),
        ]);
        if (cancelled) return;
        type R = { id: string; title: string; date: string; status: string; host_id?: string };
        const hosted = ((hostedRes.data ?? []) as R[]).filter((r) => statuses.includes(r.status));
        const partIds = [...new Set((partsRes.data ?? []).map((p: { run_id: string }) => p.run_id))];
        let joined: R[] = [];
        if (partIds.length) {
          const jr = await supabaseClient
            .from('runs')
            .select('id, title, date, status, host_id')
            .in('id', partIds)
            .in('status', statuses);
          if (!jr.error && jr.data) {
            joined = (jr.data as R[]).filter((r) => r.host_id !== user.id);
          }
        }
        if (cancelled) return;
        const hostedIds = new Set(hosted.map((r) => r.id));
        const rows: ProfileRunRow[] = [
          ...hosted.map((r) => ({
            id: r.id,
            title: r.title,
            date: r.date,
            status: r.status,
            role: 'hosting' as const,
          })),
          ...joined
            .filter((r) => !hostedIds.has(r.id))
            .map((r) => ({
              id: r.id,
              title: r.title,
              date: r.date,
              status: r.status,
              role: 'joined' as const,
            })),
        ];
        rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setMyRuns(rows);
      } catch {
        setMyRuns([]);
      } finally {
        if (!cancelled) setRunsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseClient, user, loading, isLoading]);

  const handleVehicleSaved = (v: Vehicle) => {
    setVehicles((prev) => {
      const idx = prev.findIndex((x) => x.id === v.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = v;
        return next;
      }
      return [...prev, v];
    });
  };

  const handleSignOut = async () => {
    await signOut();
    showToast('Signed out successfully', 'success');
    router.push('/');
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-app-shell mx-auto">
          <ProfileSkeleton />
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Not logged in OR profile failed to load ────────────────────────────────
  if (!user || fetchError || (!profile && isConfigured)) {
    const isProfileMissing = user && (!profile || fetchError);
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-muted border-2 border-border flex items-center justify-center">
            <User size={36} className="text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-[22px] font-black text-foreground tracking-tight">
              {isProfileMissing ? 'Profile Not Found' : 'Your Profile'}
            </h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
              {isProfileMissing
                ? 'Your account was created but the profile record is missing. Try signing out and back in.'
                : 'Sign in to view your rig portfolio, posts, and community profile.'}
            </p>
          </div>
          {isProfileMissing ? (
            <button
              onClick={async () => { await signOut(); router.push('/login'); }}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-card border-2 border-border hover:border-primary text-foreground font-black text-[17px] transition-colors"
            >
              Sign Out and Try Again
            </button>
          ) : (
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-primary hover:opacity-90 text-primary-foreground font-black text-[17px] transition-colors shadow-lg shadow-primary/30"
            >
              Sign In to View Profile
            </Link>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  const isVerified = (displayProfile as typeof PLACEHOLDER_PROFILE).is_verified ?? false;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border safe-top">
        <div className="max-w-app-shell mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-[17px] font-bold text-foreground">Rig Portfolio</h1>
          <div className="flex items-center gap-0.5">
            {(profile?.role === 'owner' || profile?.role === 'admin') && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-admin-panel'))}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-primary hover:text-primary/90 transition-colors touch-manipulation"
                aria-label="Open admin tools"
              >
                <Shield size={20} />
              </button>
            )}
            <Link
              href="/profile/edit"
              className="px-3 py-1.5 mr-1 text-[12px] font-bold text-primary hover:text-primary/90 border border-primary/40 rounded-full touch-manipulation"
            >
              Edit
            </Link>
            <Link
              href="/settings/"
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
            >
              <Settings size={20} />
            </Link>
          </div>
        </div>
      </header>

      {supabaseClient && user ? (
        <div className="max-w-app-shell mx-auto px-4 py-2.5 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-muted/80">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Theme</span>
          <ProfileThemeSwatches
            supabaseClient={supabaseClient}
            userId={user.id}
            profileUiTheme={profile?.ui_theme as string | undefined}
            onApplied={refreshProfile}
          />
        </div>
      ) : null}

      <main className="max-w-app-shell mx-auto pb-safe-nav">
        {/* Avatar + Bio ──────────────────────────── */}
        <section className="px-4 pt-5 pb-4 border-b border-border">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                aria-label="Change avatar"
                className="relative w-20 h-20 rounded-full bg-card overflow-hidden ring-2 ring-primary/40 block focus:outline-none focus-visible:ring-4 focus-visible:ring-primary"
              >
                {(localAvatarUrl ?? displayProfile.avatar_url) ? (
                  <img
                    src={(localAvatarUrl ?? displayProfile.avatar_url) as string}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={32} className="text-muted-foreground" />
                  </div>
                )}
                {/* Uploading overlay */}
                {avatarUploading && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-primary" />
                  </div>
                )}
              </button>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary disabled:bg-muted rounded-full flex items-center justify-center transition-colors"
                aria-label="Change avatar"
                tabIndex={-1}
              >
                {avatarUploading
                  ? <Loader2 size={11} className="animate-spin text-primary-foreground" />
                  : <Camera size={13} className="text-primary-foreground" />
                }
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-[17px] font-bold text-foreground leading-tight">{displayName}</h2>
                {isVerified && (
                  <div className="relative flex items-center" aria-label="Verified member">
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary/40"
                      animate={{ scale: [1, 1.7, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <BadgeCheck size={17} className="relative text-primary fill-primary/20 flex-shrink-0" />
                    <span className="relative ml-1 text-[10px] font-black text-primary uppercase tracking-wider">Verified</span>
                  </div>
                )}
                {(profile?.role ?? displayProfile.role) === 'owner' && (
                  <span className="px-2 py-0.5 text-[11px] font-black text-black bg-[#FF8C00] rounded-md leading-none flex-shrink-0">
                    OWNER
                  </span>
                )}
              </div>
              {displayProfile.location && (
                <div className="flex items-center gap-1 text-[13px] text-muted-foreground mt-0.5">
                  <MapPin size={12} />
                  <span>{String(displayProfile.location)}</span>
                </div>
              )}
              {displayProfile.experience_level && (
                <span className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm ${
                  displayProfile.experience_level === 'Beginner'
                    ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                    : displayProfile.experience_level === 'Advanced' || displayProfile.experience_level === 'Expert'
                    ? 'bg-primary/15 text-primary/90 border border-primary/30'
                    : 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30'
                }`}>
                  {String(displayProfile.experience_level)}
                </span>
              )}
            </div>
          </div>

          {displayProfile.bio && (
            <p className="mt-3 text-[14px] text-muted-foreground leading-relaxed">{String(displayProfile.bio)}</p>
          )}

          {/* Stats row — aligned with typical social profiles */}
          <div className="flex justify-around mt-4 pt-4 border-t border-border">
            {[
              { label: 'Posts', value: postsCount, mode: null },
              { label: 'Followers', value: followersCount, mode: 'followers' as const },
              { label: 'Following', value: followingCount, mode: 'following' as const },
            ].map(({ label, value, mode }) => {
              const content = (
                <>
                  <p className="text-[18px] font-bold text-foreground">{value}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
                </>
              );
              return mode ? (
                <button
                  key={label}
                  type="button"
                  onClick={() => setFollowListMode(mode)}
                  className="text-center min-w-[72px] rounded-xl py-1 hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {content}
                </button>
              ) : (
                <div key={label} className="text-center min-w-[72px] py-1">
                  {content}
                </div>
              );
            })}
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-3">
            {vehicles.length} rig{vehicles.length !== 1 ? 's' : ''} in garage · {clubsCount} club{clubsCount !== 1 ? 's' : ''} · {runsJoinedCount} run{runsJoinedCount !== 1 ? 's' : ''} joined
          </p>
        </section>

        {/* Rigs ─────────────────────────────────── */}
        <section className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2">
              <Truck size={16} className="text-primary" />
              Your Garage
              {vehicles.filter((v) => v.is_primary).length > 0 && (
                <span className="text-[10px] font-bold text-primary/90 bg-primary/10 border border-primary/25 px-1.5 py-0.5 rounded-full ml-1">Primary Rig Active</span>
              )}
            </h3>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setEditingVehicle(null)}
              className="flex items-center gap-1 text-[13px] text-primary hover:text-primary/90 transition-colors"
            >
              <Plus size={15} /> Add Rig
            </motion.button>
          </div>

          {vehicles.length > 0 ? (
            <div className="space-y-2.5">
              {vehicles.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-xl p-3.5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-foreground">
                          {v.year} {v.make} {v.model}
                          {v.trim ? ` ${v.trim}` : ''}
                        </span>
                        {v.is_primary && (
                          <span className="px-1.5 py-0.5 bg-primary/15 text-primary/90 text-[10px] font-bold uppercase rounded">
                            Primary
                          </span>
                        )}
                      </div>
                      {v.modifications && (
                        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{v.modifications}</p>
                      )}
                      {!v.is_primary && (
                        <button
                          onClick={async () => {
                            if (!supabase || !user) return;
                            try {
                              await supabase.from('vehicles').update({ is_primary: false }).eq('user_id', user.id);
                              await supabase.from('vehicles').update({ is_primary: true }).eq('id', v.id);
                              setVehicles((prev) => prev.map((x) => ({ ...x, is_primary: x.id === v.id })));
                              showToast('Primary rig updated', 'success');
                            } catch { showToast('Could not set primary rig', 'error'); }
                          }}
                          className="mt-2 text-[11px] text-muted-foreground hover:text-primary/90 transition-colors"
                        >
                          Set as Primary
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingVehicle(v)}
                      className="p-1.5 text-muted-foreground hover:text-primary/90 transition-colors ml-2 flex-shrink-0"
                      aria-label="Edit rig"
                    >
                      <Edit2 size={15} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setEditingVehicle(null)}
              className="w-full py-6 border border-dashed border-border rounded-xl text-[13px] text-muted-foreground hover:text-primary/90 hover:border-primary/30 transition-colors flex flex-col items-center gap-2"
            >
              <Truck size={24} className="text-muted-foreground" />
              Tap to add your first rig
            </button>
          )}
        </section>

        {/* My runs — host + joined ───────────────── */}
        <section className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2">
              <Calendar size={16} className="text-primary" />
              My runs
            </h3>
            <Link
              href="/runs/create"
              className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-primary/90 transition-colors"
            >
              <Plus size={14} />
              Host
            </Link>
          </div>
          {runsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={22} className="animate-spin text-muted-foreground" />
            </div>
          ) : myRuns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-8 px-4 text-center">
              <p className="text-[13px] text-muted-foreground mb-3">Join or host a run — it will show up here.</p>
              <Link href="/runs" className="text-[13px] font-bold text-primary hover:text-primary/90">
                Browse runs
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {myRuns.map((r) => (
                <Link
                  key={`${r.role}-${r.id}`}
                  href={`/runs/${r.id}`}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:border-primary/35 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
                    <Zap size={18} className={r.status === 'active' ? 'text-primary/90' : 'text-muted-foreground'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-foreground truncate">{r.title}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {new Date(r.date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                      <span className="text-muted-foreground"> · </span>
                      <span className="capitalize">{r.status}</span>
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                      r.role === 'hosting'
                        ? 'bg-primary/15 text-primary/90 border border-primary/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                    }`}
                  >
                    {r.role === 'hosting' ? 'Hosting' : 'Joined'}
                  </span>
                  <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Activity tabs ────────────────────────── */}
        <section>
          {/* Tab bar */}
          <div className="flex border-b border-border">
            {(
              [
                { id: 'posts',     label: 'Posts',     Icon: Grid3X3 },
                { id: 'reposts',   label: 'Reposts',   Icon: Repeat2 },
                { id: 'liked',     label: 'Liked',     Icon: Heart },
                { id: 'favorites', label: 'Favorites', Icon: Bookmark },
              ] as { id: TabId; label: string; Icon: LucideIcon }[]
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1 py-3 text-[12px] font-semibold transition-colors border-b-2 ${
                  activeTab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-muted-foreground'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {(() => {
            const dataMap: Record<TabId, Post[]> = { posts: myPosts, reposts, liked, favorites };
            const emptyMessages: Record<TabId, string> = {
              posts:     'No posts yet.',
              reposts:   'No reposts yet.',
              liked:     'No liked posts yet.',
              favorites: 'No saved posts yet.',
            };
            const data = dataMap[activeTab];

            if (tabLoading) {
              return (
                <div className="flex justify-center py-12">
                  <Loader2 size={22} className="animate-spin text-muted-foreground" />
                </div>
              );
            }

            if (data.length === 0) {
              return (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground text-[14px]">{emptyMessages[activeTab]}</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-3 gap-px bg-card">
                {data.map((p) => (
                  <Link key={p.id} href={`/posts/${p.id}`} className="relative aspect-square bg-background overflow-hidden group">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.caption ?? p.body ?? ''}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center p-2">
                        <span className="text-[10px] text-muted-foreground text-center line-clamp-4 leading-tight">
                          {p.body ?? p.caption}
                        </span>
                      </div>
                    )}
                    {/* Repost badge */}
                    {p.repost_of_id && (
                      <div className="absolute top-1 left-1">
                        <Repeat2 size={11} className="text-emerald-400 drop-shadow" />
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-transparent group-hover:bg-background/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex items-center gap-1 text-foreground text-[12px] font-bold">
                        <Heart size={13} className="fill-foreground text-foreground" />
                        {p.likes_count ?? 0}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            );
          })()}
        </section>

        {/* Quick links ───────────────────────────── */}
        <section className="px-4 py-4 border-t border-border space-y-2">
          {[
            { href: '/achievements', icon: Award, label: 'Achievements' },
            { href: '/runs?filter=completed', icon: Calendar, label: 'Run History' },
          ].map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} className="flex items-center justify-between p-3.5 bg-card border border-border rounded-xl hover:border-border transition-colors">
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-primary" />
                <span className="text-[14px] text-foreground/90">{label}</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
          ))}
        </section>

        {/* Sign out ──────────────────────────────── */}
        <section className="px-4 pb-12 pt-2">
          <div className="border-t border-border pt-8">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-3 py-5 bg-background border-2 border-border hover:border-red-500 hover:bg-red-500/8 text-muted-foreground hover:text-red-400 text-[17px] font-black rounded-2xl transition-all"
            >
              <LogOut size={22} />
              Log Out
            </motion.button>
          </div>
        </section>
      </main>

      {/* Edit Rig Modal */}
      <AnimatePresence>
        {editingVehicle !== undefined && (
          <EditRigModal
            vehicle={editingVehicle}
            onClose={() => setEditingVehicle(undefined)}
            onSaved={(v) => { handleVehicleSaved(v); setEditingVehicle(undefined); }}
          />
        )}
      </AnimatePresence>

      <FollowListDrawer
        open={followListMode !== null}
        mode={followListMode ?? 'followers'}
        userId={user.id}
        supabaseClient={supabaseClient}
        onClose={() => setFollowListMode(null)}
      />

      <BottomNav />
    </div>
  );
}
