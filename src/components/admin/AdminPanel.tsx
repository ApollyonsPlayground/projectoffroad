'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ArrowLeft,
  Loader2,
  Users,
  Building2,
  FileText,
  Trash2,
  EyeOff,
  Eye,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { ensureStoragePublicObjectUrl } from '@/lib/supabase/storagePublicUrl';

type Tab = 'overview' | 'clubs' | 'posts' | 'users';
type ClubFilter = 'all' | 'verified' | 'pending';

export type AdminPanelVariant = 'page' | 'drawer';

type ClubRow = {
  id: string;
  name: string;
  slug: string;
  verified: boolean;
  description?: string | null;
  location?: string | null;
  created_at?: string;
};

type Props = {
  variant: AdminPanelVariant;
  /** Close the parent drawer (drawer variant only) */
  onCloseDrawer?: () => void;
};

export function AdminPanel({ variant, onCloseDrawer }: Props) {
  const router = useRouter();
  const { user, supabaseClient, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [role, setRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(() => (variant === 'drawer' ? 'clubs' : 'overview'));
  const [clubFilter, setClubFilter] = useState<ClubFilter>('pending');
  const [busy, setBusy] = useState(false);

  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userQuery, setUserQuery] = useState('');

  const authHeaders = useCallback(() => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  useEffect(() => {
    if (!supabaseClient || !user) return;
    supabaseClient.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
    });
  }, [supabaseClient, user]);

  useEffect(() => {
    if (!supabaseClient || !user) return;
    supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setRole((data as { role?: string } | null)?.role ?? null));
  }, [supabaseClient, user]);

  const allowed = role === 'owner' || role === 'admin';

  const loadOverview = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/admin/stats', { headers: authHeaders() });
    if (!res.ok) return;
    const j = await res.json();
    setStats(j.counts ?? {});
  }, [token, authHeaders]);

  const loadClubs = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/admin/clubs', { headers: authHeaders() });
    if (!res.ok) return;
    const j = await res.json();
    setClubs(j.clubs ?? []);
  }, [token, authHeaders]);

  const loadPosts = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/admin/posts?limit=60', { headers: authHeaders() });
    if (!res.ok) return;
    const j = await res.json();
    setPosts(j.posts ?? []);
  }, [token, authHeaders]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    const q = userQuery ? `?q=${encodeURIComponent(userQuery)}` : '';
    const res = await fetch(`/api/admin/users${q}`, { headers: authHeaders() });
    if (!res.ok) return;
    const j = await res.json();
    setUsers(j.users ?? []);
  }, [token, authHeaders, userQuery]);

  useEffect(() => {
    if (!allowed || !token) return;
    void loadOverview();
  }, [allowed, token, loadOverview]);

  useEffect(() => {
    if (!allowed || !token) return;
    if (tab === 'clubs') void loadClubs();
    if (tab === 'posts') void loadPosts();
    if (tab === 'users') void loadUsers();
  }, [allowed, token, tab, loadClubs, loadPosts, loadUsers]);

  useEffect(() => {
    if (!authLoading && user && role !== null && !allowed) {
      showToast('Admin access only', 'error');
      router.replace('/feed/');
    }
  }, [authLoading, user, allowed, role, router, showToast]);

  const verifyClub = async (id: string, verified: boolean) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/clubs/${id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      showToast(verified ? 'Marked as verified club' : 'Marked as not verified', 'success');
      await loadClubs();
      await loadOverview();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm('Delete this post permanently?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      showToast('Post deleted', 'success');
      setPosts((p) => p.filter((x) => x.id !== id));
      await loadOverview();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleHiddenPost = async (id: string, hidden: boolean) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      showToast(hidden ? 'Hidden from feed' : 'Restored to feed', 'success');
      setPosts((p) => p.map((x) => (x.id === id ? { ...x, hidden } : x)));
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  const setUserRole = async (id: string, newRole: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      showToast('Role updated', 'success');
      await loadUsers();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  const filteredClubs = useMemo(() => {
    let list = [...clubs];
    if (clubFilter === 'verified') list = list.filter((c) => c.verified);
    if (clubFilter === 'pending') list = list.filter((c) => !c.verified);
    list.sort((a, b) => {
      if (a.verified !== b.verified) return a.verified ? 1 : -1;
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    return list;
  }, [clubs, clubFilter]);

  const pendingCount = useMemo(() => clubs.filter((c) => !c.verified).length, [clubs]);
  const verifiedCount = useMemo(() => clubs.filter((c) => c.verified).length, [clubs]);

  if (authLoading || !user || role === null) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  const tabs: { id: Tab; label: string; Icon: typeof ShieldAlert }[] = [
    { id: 'overview', label: 'Overview', Icon: ShieldAlert },
    { id: 'clubs', label: 'Clubs', Icon: Building2 },
    { id: 'posts', label: 'Posts', Icon: FileText },
    { id: 'users', label: 'Users', Icon: Users },
  ];

  const headerTitle = variant === 'drawer' ? 'Admin tools' : 'Owner / Admin';
  const headerSubtitle =
    variant === 'drawer'
      ? 'Clubs, posts & roles — full page has more room'
      : 'Moderation & club verification';

  return (
    <div className={variant === 'page' ? 'min-h-screen bg-black pb-28' : 'bg-black'}>
      <header
        className={`sticky top-0 z-40 bg-black/95 border-b border-zinc-800 backdrop-blur-xl safe-top ${
          variant === 'drawer' ? 'rounded-t-2xl' : ''
        }`}
      >
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {variant === 'page' ? (
            <Link href="/feed/" className="p-2 -ml-2 text-zinc-400 hover:text-white touch-manipulation">
              <ArrowLeft size={22} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => onCloseDrawer?.()}
              className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ShieldAlert className="text-orange-500 shrink-0" size={22} />
            <div className="min-w-0">
              <h1 className="text-lg font-black text-white truncate">{headerTitle}</h1>
              <p className="text-[11px] text-zinc-500 truncate">{headerSubtitle}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {variant === 'drawer' && (
              <Link
                href="/admin"
                className="text-[11px] font-bold text-orange-500 flex items-center gap-0.5"
                onClick={() => onCloseDrawer?.()}
              >
                Full page <ExternalLink size={12} />
              </Link>
            )}
            <Link href="/feed/" className="text-[12px] font-semibold text-zinc-400 hover:text-white">
              Home
            </Link>
          </div>
        </div>

        <div className="flex gap-1 px-3 pb-2 max-w-lg mx-auto overflow-x-auto">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold whitespace-nowrap transition-colors touch-manipulation min-h-[40px] ${
                tab === id ? 'bg-orange-500 text-black' : 'bg-zinc-900 text-zinc-400'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-4">
        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <p className="text-[13px] text-zinc-500">
              Use the <strong className="text-zinc-300">Clubs</strong> tab to turn verification on or off. Verified
              clubs can host official runs and show the badge in the app.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Posts', stats?.posts ?? '—'],
                ['Users', stats?.users ?? '—'],
                ['Clubs', stats?.clubs ?? '—'],
                ['Flag rows', stats?.postFlagRows ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <p className="text-[11px] font-bold text-zinc-500 uppercase">{k}</p>
                  <p className="text-2xl font-black text-white mt-1">{v}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setTab('clubs');
                setClubFilter('pending');
              }}
              className="w-full text-left bg-amber-500/10 border border-amber-500/35 rounded-xl p-4"
            >
              <p className="font-bold text-amber-200 mb-1">Clubs waiting on you</p>
              <p className="text-[13px] text-amber-100/90">
                {stats?.clubsPendingVerification ?? pendingCount} not verified → open Clubs tab (filter: Needs review).
              </p>
            </button>
          </motion.div>
        )}

        {tab === 'clubs' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['pending', `Needs review (${pendingCount})`],
                  ['verified', `Verified (${verifiedCount})`],
                  ['all', `All (${clubs.length})`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setClubFilter(id)}
                  className={`px-3 py-2 rounded-lg text-[12px] font-bold touch-manipulation min-h-[40px] ${
                    clubFilter === id
                      ? 'bg-orange-500 text-black'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="text-[12px] text-zinc-500">
              <strong className="text-zinc-300">Verified</strong> = real club on the platform (badge + official runs).{' '}
              <strong className="text-zinc-300">Not verified</strong> = listing only until you confirm.
            </p>

            <button
              type="button"
              onClick={() => loadClubs()}
              className="text-[12px] text-orange-500 font-semibold touch-manipulation py-1"
            >
              Refresh list
            </button>

            {filteredClubs.map((c) => (
              <div
                key={c.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="flex justify-between gap-2 items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white text-[16px] leading-snug">{c.name}</p>
                    <p className="text-[12px] text-zinc-500 font-mono truncate mt-0.5">{c.slug}</p>
                    {c.location && (
                      <p className="text-[12px] text-zinc-400 mt-2 flex items-start gap-1.5">
                        <MapPin size={14} className="text-zinc-600 shrink-0 mt-0.5" />
                        <span>{c.location}</span>
                      </p>
                    )}
                    {c.description && (
                      <p className="text-[13px] text-zinc-500 mt-2 line-clamp-3">{c.description}</p>
                    )}
                    {c.created_at && (
                      <p className="text-[11px] text-zinc-600 mt-2 flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(c.created_at).toLocaleDateString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    )}
                  </div>
                  <div
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                      c.verified
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/35'
                    }`}
                  >
                    {c.verified ? 'Verified club' : 'Not verified'}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {!c.verified ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => verifyClub(c.id, true)}
                      className="flex items-center justify-center gap-2 min-h-[48px] py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[14px] rounded-xl disabled:opacity-50 touch-manipulation"
                    >
                      <CheckCircle2 size={18} /> Designate as verified club
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          confirm(
                            'Remove verified status? The club will lose the badge and official club runs until verified again.'
                          )
                        )
                          verifyClub(c.id, false);
                      }}
                      className="flex items-center justify-center gap-2 min-h-[48px] py-3 bg-zinc-800 border border-zinc-600 text-zinc-300 font-semibold text-[14px] rounded-xl disabled:opacity-50 touch-manipulation"
                    >
                      <XCircle size={18} /> Remove verified status
                    </button>
                  )}
                </div>

                <Link
                  href={`/clubs/${c.id}`}
                  className="text-[12px] font-semibold text-orange-500 flex items-center gap-1 touch-manipulation py-1"
                >
                  View club page <ExternalLink size={12} />
                </Link>
              </div>
            ))}
            {filteredClubs.length === 0 && (
              <p className="text-zinc-600 text-[14px] text-center py-10">
                No clubs in this filter.
              </p>
            )}
          </div>
        )}

        {tab === 'posts' && (
          <div className="space-y-3">
            <button type="button" onClick={() => loadPosts()} className="text-[12px] text-orange-500 font-semibold">
              Refresh
            </button>
            {posts.map((p) => (
              <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between gap-2">
                  <p className="text-[11px] text-zinc-500">{p.user_name ?? 'User'}</p>
                  <p className="text-[10px] text-zinc-600">{new Date(p.created_at).toLocaleString()}</p>
                </div>
                <p className="text-[14px] text-zinc-200 whitespace-pre-wrap break-words">{p.body}</p>
                {p.image_url && (
                  <img
                    src={ensureStoragePublicObjectUrl(p.image_url) || p.image_url}
                    alt=""
                    className="rounded-lg max-h-40 object-cover w-full border border-zinc-800"
                  />
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => deletePost(p.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-500/15 text-red-400 border border-red-500/40 rounded-lg text-[12px] font-bold touch-manipulation"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleHiddenPost(p.id, !p.hidden)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-[12px] font-bold touch-manipulation"
                  >
                    {p.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                    {p.hidden ? 'Show in feed' : 'Hide from feed'}
                  </button>
                </div>
              </div>
            ))}
            {posts.length === 0 && <p className="text-zinc-600 text-[14px] text-center py-8">No posts.</p>}
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search name or email"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-[14px] text-white min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => loadUsers()}
                className="px-4 py-2 min-h-[44px] bg-orange-500 text-black font-bold rounded-lg text-[13px] touch-manipulation"
              >
                Search
              </button>
            </div>
            <p className="text-[11px] text-zinc-600">
              Changing roles is owner-only. Use carefully when promoting admins.
            </p>
            {users.map((u) => (
              <div key={u.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-white truncate">{u.name ?? '—'}</p>
                <p className="text-[12px] text-zinc-500 truncate">{u.email}</p>
                <p className="text-[11px] text-zinc-600">
                  Role: <span className="text-orange-400 font-bold">{u.role ?? 'user'}</span>
                </p>
                {role === 'owner' && u.id !== user.id && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(['user', 'admin'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        disabled={busy}
                        onClick={() => setUserRole(u.id, r)}
                        className="px-3 py-2 min-h-[40px] bg-zinc-800 border border-zinc-700 rounded-lg text-[11px] font-bold text-zinc-300 uppercase touch-manipulation"
                      >
                        Set {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {users.length === 0 && <p className="text-zinc-600 text-[14px] text-center py-8">No users.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
