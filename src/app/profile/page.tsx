'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  MapPin,
  BadgeCheck,
  Truck,
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
  Route,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { ProfileSkeleton } from '@/components/SkeletonLoader';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase';

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

interface Post {
  id: string;
  image_url?: string;
  caption: string;
  likes_count: number;
  created_at: string;
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

const PLACEHOLDER_POSTS: Post[] = [
  { id: 'p1', image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&q=80', caption: 'Big Bear weekend run', likes_count: 47, created_at: '' },
  { id: 'p2', image_url: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400&q=80', caption: 'Holcomb Valley', likes_count: 89, created_at: '' },
  { id: 'p3', image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80', caption: 'Morning trails', likes_count: 34, created_at: '' },
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
      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm((p) => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        className="w-full bg-zinc-900 border border-zinc-800 focus:border-orange-500/60 rounded-xl px-3 py-2.5 text-[14px] text-zinc-200 placeholder:text-zinc-600 outline-none transition-colors"
      />
    </div>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9992] bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        className="fixed bottom-0 left-0 right-0 z-[9993] max-w-md mx-auto bg-zinc-950 border border-zinc-800 rounded-t-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div className="w-9 h-1 bg-zinc-800 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900">
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
          <span className="font-bold text-white text-[15px]">
            {isNew ? 'Add Rig' : 'Edit Rig'}
          </span>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold text-[13px] rounded-full transition-colors min-w-[68px] justify-center"
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
            <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Modifications</label>
            <textarea
              rows={3}
              value={form.modifications}
              onChange={(e) => setForm((p) => ({ ...p, modifications: e.target.value }))}
              placeholder="Lift kit, tires, armor, recovery gear..."
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-orange-500/60 rounded-xl px-3 py-2.5 text-[14px] text-zinc-200 placeholder:text-zinc-600 outline-none resize-none transition-colors"
            />
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, profile, loading, signOut, isConfigured } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'runs'>('posts');
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null | undefined>(undefined); // undefined = closed

  // Cast profile (Record<string,unknown>) to a typed shape for safe rendering
  type DisplayProfile = typeof PLACEHOLDER_PROFILE & { avatar_url?: string | null };
  const displayProfile: DisplayProfile = (profile as DisplayProfile | null) || PLACEHOLDER_PROFILE;

  const fetchData = useCallback(async () => {
    // No supabase or no user: show placeholders (demo mode)
    if (!supabase || !user) {
      setVehicles(PLACEHOLDER_VEHICLES);
      setPosts(PLACEHOLDER_POSTS);
      setIsLoading(false);
      return;
    }
    try {
      setFetchError(false);
      const [vehiclesRes, postsRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('user_id', user.id),
        supabase.from('posts').select('id, image_url, caption, likes_count, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ]);
      if (vehiclesRes.error) throw vehiclesRes.error;
      if (postsRes.error) throw postsRes.error;
      setVehicles(vehiclesRes.data ?? []);
      setPosts(postsRes.data ?? []);
    } catch {
      setFetchError(true);
      setVehicles([]);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading) fetchData();
  }, [loading, fetchData]);

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
      <div className="min-h-screen bg-black">
        <div className="max-w-md mx-auto">
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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center">
            <User size={36} className="text-zinc-600" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-[22px] font-black text-white tracking-tight">
              {isProfileMissing ? 'Profile Not Found' : 'Your Profile'}
            </h2>
            <p className="text-[14px] text-zinc-500 leading-relaxed max-w-[260px] mx-auto">
              {isProfileMissing
                ? 'Your account was created but the profile record is missing. Try signing out and back in.'
                : 'Sign in to view your rig portfolio, posts, and community profile.'}
            </p>
          </div>
          {isProfileMissing ? (
            <button
              onClick={async () => { await signOut(); router.push('/login'); }}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-zinc-900 border-2 border-zinc-700 hover:border-orange-500 text-white font-black text-[17px] transition-colors"
            >
              Sign Out and Try Again
            </button>
          ) : (
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-black font-black text-[17px] transition-colors shadow-lg shadow-orange-500/30"
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
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-xl border-b border-zinc-900">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-[17px] font-bold text-white">Rig Portfolio</h1>
          <Link href="/settings" className="p-2 text-zinc-500 hover:text-white transition-colors">
            <Settings size={20} />
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-24">
        {/* Avatar + Bio ──────────────────────────── */}
        <section className="px-4 pt-5 pb-4 border-b border-zinc-900">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-zinc-900 overflow-hidden ring-2 ring-orange-500/40">
                {displayProfile.avatar_url ? (
                  <img src={displayProfile.avatar_url as string} alt={String(displayProfile.name)} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={32} className="text-zinc-600" />
                  </div>
                )}
              </div>
              <button
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center"
                aria-label="Change avatar"
              >
                <Camera size={13} className="text-black" />
              </button>
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-[17px] font-bold text-white leading-tight">{String(displayProfile.name)}</h2>
                {isVerified && (
                  <div className="relative flex items-center" aria-label="Verified member">
                    <motion.div
                      className="absolute inset-0 rounded-full bg-orange-500/40"
                      animate={{ scale: [1, 1.7, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <BadgeCheck size={17} className="relative text-orange-500 fill-orange-500/20 flex-shrink-0" />
                    <span className="relative ml-1 text-[10px] font-black text-orange-500 uppercase tracking-wider">Verified</span>
                  </div>
                )}
                {(profile?.role ?? displayProfile.role) === 'owner' && (
                  <span className="px-2 py-0.5 text-[11px] font-black text-black bg-[#FF8C00] rounded-md leading-none flex-shrink-0">
                    OWNER
                  </span>
                )}
              </div>
              {displayProfile.location && (
                <div className="flex items-center gap-1 text-[13px] text-zinc-500 mt-0.5">
                  <MapPin size={12} />
                  <span>{String(displayProfile.location)}</span>
                </div>
              )}
              {displayProfile.experience_level && (
                <span className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm ${
                  displayProfile.experience_level === 'Beginner'
                    ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                    : displayProfile.experience_level === 'Advanced' || displayProfile.experience_level === 'Expert'
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                    : 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30'
                }`}>
                  {String(displayProfile.experience_level)}
                </span>
              )}
            </div>
          </div>

          {displayProfile.bio && (
            <p className="mt-3 text-[14px] text-zinc-400 leading-relaxed">{String(displayProfile.bio)}</p>
          )}

          {/* Stats row */}
          <div className="flex justify-around mt-4 pt-4 border-t border-zinc-900">
            {[
              { label: 'Posts',  value: posts.length },
              { label: 'Rigs',   value: vehicles.length },
              { label: 'Joined', value: (profile as Record<string,unknown>)?.created_at ? new Date((profile as Record<string,unknown>).created_at as string).getFullYear() : new Date().getFullYear() },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-[18px] font-bold text-white">{value}</p>
                <p className="text-[11px] text-zinc-600 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Rigs ─────────────────────────────────── */}
        <section className="px-4 py-4 border-b border-zinc-900">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold text-white flex items-center gap-2">
              <Truck size={16} className="text-orange-500" />
              Your Garage
              {vehicles.filter((v) => v.is_primary).length > 0 && (
                <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/25 px-1.5 py-0.5 rounded-full ml-1">Primary Rig Active</span>
              )}
            </h3>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setEditingVehicle(null)}
              className="flex items-center gap-1 text-[13px] text-orange-500 hover:text-orange-400 transition-colors"
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
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-white">
                          {v.year} {v.make} {v.model}
                          {v.trim ? ` ${v.trim}` : ''}
                        </span>
                        {v.is_primary && (
                          <span className="px-1.5 py-0.5 bg-orange-500/15 text-orange-400 text-[10px] font-bold uppercase rounded">
                            Primary
                          </span>
                        )}
                      </div>
                      {v.modifications && (
                        <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{v.modifications}</p>
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
                          className="mt-2 text-[11px] text-zinc-600 hover:text-orange-400 transition-colors"
                        >
                          Set as Primary
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingVehicle(v)}
                      className="p-1.5 text-zinc-600 hover:text-orange-400 transition-colors ml-2 flex-shrink-0"
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
              className="w-full py-6 border border-dashed border-zinc-800 rounded-xl text-[13px] text-zinc-600 hover:text-orange-400 hover:border-orange-500/30 transition-colors flex flex-col items-center gap-2"
            >
              <Truck size={24} className="text-zinc-700" />
              Tap to add your first rig
            </button>
          )}
        </section>

        {/* Posts / Runs tabs ─────────────────────── */}
        <section>
          {/* Tab bar */}
          <div className="flex border-b border-zinc-900">
            {([['posts', <Grid3X3 key="g" size={16} />, 'Posts'], ['runs', <Route key="r" size={16} />, 'Runs']] as const).map(([tab, icon, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'posts' | 'runs')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-semibold transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {activeTab === 'posts' && (
            posts.length > 0 ? (
              <div className="grid grid-cols-3 gap-px bg-zinc-900">
                {posts.map((p) => (
                  <Link key={p.id} href={`/posts/${p.id}`} className="relative aspect-square bg-black overflow-hidden group">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.caption}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-950 flex items-center justify-center p-2">
                        <span className="text-[10px] text-zinc-600 text-center line-clamp-4 leading-tight">{p.caption}</span>
                      </div>
                    )}
                    {/* Hover overlay with like count */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex items-center gap-1 text-white text-[12px] font-bold">
                        <Heart size={13} className="fill-white text-white" />
                        {p.likes_count}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-zinc-600 text-[14px]">No posts yet</p>
              </div>
            )
          )}

          {activeTab === 'runs' && (
            <div className="py-12 text-center px-4">
              <Route size={28} className="mx-auto text-zinc-800 mb-2" />
              <p className="text-zinc-600 text-[14px]">Run history coming soon</p>
              <Link href="/runs" className="mt-3 inline-block text-[13px] text-orange-500 hover:text-orange-400">
                Browse upcoming runs
              </Link>
            </div>
          )}
        </section>

        {/* Quick links ───────────────────────────── */}
        <section className="px-4 py-4 border-t border-zinc-900 space-y-2">
          {[
            { href: '/achievements', icon: Award, label: 'Achievements' },
            { href: '/runs?filter=completed', icon: Calendar, label: 'Run History' },
          ].map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} className="flex items-center justify-between p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-orange-500" />
                <span className="text-[14px] text-zinc-200">{label}</span>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
            </Link>
          ))}
        </section>

        {/* Sign out ──────────────────────────────── */}
        <section className="px-4 pb-12 pt-2">
          <div className="border-t border-zinc-900 pt-8">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-3 py-5 bg-black border-2 border-zinc-800 hover:border-red-500 hover:bg-red-500/8 text-zinc-400 hover:text-red-400 text-[17px] font-black rounded-2xl transition-all"
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

      <BottomNav />
    </div>
  );
}
