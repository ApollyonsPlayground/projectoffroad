'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Pencil, Loader2, MessageCircle, Camera } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/db/supabase';
import BottomNav from '@/components/BottomNav';
import ClubGarage from '@/components/clubs/ClubGarage';
import { ClubHeroRotator } from '@/components/clubs/ClubHeroRotator';
import { publicClubGarageUrl } from '@/lib/clubs/clubGarageUrl';
import { useToast } from '@/components/Toast';
import { ensureStoragePublicObjectUrl } from '@/lib/supabase/storagePublicUrl';
import { resolvePublicDisplayName } from '@/lib/profileDisplay';
import { instagramHref, websiteHref } from '@/lib/safeExternalUrl';
import { useImagePicker } from '@/hooks/useImagePicker';
import { isCapacitorNative } from '@/utils/capacitator/isNative';

interface Club {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  /** Public URL — hero on club runs & directory-style cards when set */
  banner_image?: string | null;
  description: string;
  location: string;
  website: string | null;
  instagram: string | null;
  verified: boolean;
  premium: boolean;
  owner_id: string;
}

interface Run {
  id: string;
  title: string;
  date: string;
  difficulty: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  status?: string;
  user?: { name: string; avatar_url: string; username?: string | null };
}

function storageAwareClubImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const s = raw.trim();
  return ensureStoragePublicObjectUrl(s) || s;
}

function normalizeClubRow(data: Record<string, unknown>): Club {
  const web = data.website ?? data.website_url;
  const ig = data.instagram ?? data.instagram_url;
  const bannerRaw =
    typeof data.banner_image === 'string' && data.banner_image.trim()
      ? data.banner_image.trim()
      : null;
  return {
    id: String(data.id ?? ''),
    name: String(data.name ?? ''),
    slug: String(data.slug ?? ''),
    logo: storageAwareClubImageUrl(data.logo),
    description: String(data.description ?? ''),
    location: String(data.location ?? ''),
    website: typeof web === 'string' && web.trim() ? web.trim() : null,
    instagram: typeof ig === 'string' && ig.trim() ? ig.trim() : null,
    banner_image: bannerRaw ? storageAwareClubImageUrl(bannerRaw) : null,
    verified: Boolean(data.verified),
    premium: Boolean(data.premium),
    owner_id: String(data.owner_id ?? ''),
  };
}

function normalizeInstagram(input: string): string {
  const t = input.trim().replace(/^@/, '');
  if (!t) return '';
  const fromUrl = t.match(/instagram\.com\/([^/?#]+)/i);
  if (fromUrl) return fromUrl[1];
  return t;
}

export default function ClubDetailPage() {
  const params = useParams();
  const clubId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params?.id]);
  const router = useRouter();
  const { user, loading: authLoading, supabaseClient } = useAuth();
  const sb = supabaseClient ?? supabase;
  const { showToast } = useToast();
  const [club, setClub] = useState<Club | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [garageHeroUrls, setGarageHeroUrls] = useState<string[]>([]);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    location: '',
    website: '',
    instagram: '',
    logo: '',
    banner_image: '',
  });

  useEffect(() => {
    if (!clubId) return;
    fetchClub();
    fetchRuns();
    fetchMembers();
    void fetchGarageHeroPhotos();
  }, [clubId]);

  async function fetchGarageHeroPhotos() {
    if (!sb || !clubId) return;
    const { data } = await sb
      .from('club_garage_photos')
      .select('storage_path')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(24);
    setGarageHeroUrls(
      (data ?? [])
        .map((row) => publicClubGarageUrl(String((row as { storage_path: string }).storage_path)))
        .filter(Boolean)
    );
  }

  // After membership status resolves, refetch runs so members can see club-only runs.
  useEffect(() => {
    if (!clubId) return;
    void fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, isMember]);

  useEffect(() => {
    if (user && members.length > 0) {
      const myRows = members.filter((m) => m.user_id === user.id);
      const approved = myRows.some((m) => String(m.status ?? '').toLowerCase() === 'approved');
      const pending = myRows.some((m) => String(m.status ?? '').toLowerCase() === 'pending');
      setIsMember(approved);
      setIsPending(!approved && pending);
    }
  }, [user, members]);

  const approvedMembers = useMemo(
    () =>
      members.filter((m) => {
        const s = String(m.status ?? 'approved').trim().toLowerCase();
        return s === 'approved';
      }),
    [members]
  );

  async function fetchClub() {
    if (!sb || !clubId) {
      setLoading(false);
      return;
    }
    const { data } = await sb.from('clubs').select('*').eq('id', clubId).single();

    if (data) setClub(normalizeClubRow(data as Record<string, unknown>));
    setLoading(false);
  }

  useEffect(() => {
    if (!club) return;
    setEditForm({
      name: club.name,
      description: club.description,
      location: club.location,
      website: club.website ?? '',
      instagram: club.instagram ?? '',
      logo: club.logo ?? '',
      banner_image: club.banner_image ?? '',
    });
  }, [club]);

  async function fetchRuns() {
    if (!sb || !clubId) return;
    let q = sb
      .from('runs')
      .select('id, title, date, difficulty')
      .eq('club_id', clubId)
      .eq('status', 'upcoming')
      .order('date', { ascending: true })
      .limit(5);

    if (!isMember) {
      q = q.eq('visibility', 'public');
    }

    const { data } = await q

    if (data) setRuns(data as Run[]);
  }

  async function fetchMembers() {
    if (!sb || !clubId) return;
    const embedTry = await sb
      .from('club_members')
      .select('*, user:users(id, name, username, avatar_url)')
      .eq('club_id', clubId)
      .order('role', { ascending: true });

    if (!embedTry.error && embedTry.data) {
      setMembers(
        (embedTry.data as Member[]).map((m) => ({
          ...m,
          user: m.user
            ? {
                ...m.user,
                name: resolvePublicDisplayName({
                  id: m.user_id,
                  username: (m.user as { username?: string | null }).username,
                }),
              }
            : m.user,
        }))
      );
      return;
    }

    const base = await sb
      .from('club_members')
      .select('id, user_id, role, status')
      .eq('club_id', clubId)
      .order('role', { ascending: true });

    const rawRows = (base.data ?? []) as {
      id: string;
      user_id: string;
      role: string;
      status?: string;
    }[];
    const userIds = [...new Set(rawRows.map((r) => r.user_id).filter(Boolean))];
    const usersById: Record<string, { name: string; avatar_url: string; username?: string | null }> = {};
    if (userIds.length) {
      const { data: urows } = await sb.from('users').select('id, name, username, avatar_url').in('id', userIds);
      for (const u of urows ?? []) {
        const row = u as { id: string; name: string | null; username?: string | null; avatar_url: string | null };
        usersById[row.id] = {
          name: resolvePublicDisplayName({ id: row.id, username: row.username }),
          avatar_url: row.avatar_url ?? '',
          username: row.username,
        };
      }
    }
    setMembers(
      rawRows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        status: r.status,
        user: usersById[r.user_id],
      }))
    );
  }

  async function uploadClubLogoFile(file: File) {
    if (!sb || !club || !user || user.id !== club.owner_id) return;
    if (!file.type.startsWith('image/')) {
      showToast('Use a JPG, PNG, or WebP image', 'info');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Club photo must be under 5 MB', 'info');
      return;
    }
    setLogoUploading(true);
    try {
      const extRaw = file.name.split('.').pop()?.toLowerCase();
      const safeExt =
        extRaw === 'png' || extRaw === 'webp' || extRaw === 'jpg' || extRaw === 'jpeg' ? extRaw : 'jpg';
      const path = `${club.id}/logo-${Date.now()}.${safeExt}`;
      const { error: upErr } = await sb.storage.from('club-logos').upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = sb.storage.from('club-logos').getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: dbErr } = await sb.from('clubs').update({ logo: url }).eq('id', club.id);
      if (dbErr) throw dbErr;
      setEditForm((f) => ({ ...f, logo: url }));
      setClub((c) => (c ? { ...c, logo: url } : c));
      await fetchClub();
      showToast('Club photo saved', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setLogoUploading(false);
    }
  }

  async function uploadClubBannerFile(file: File) {
    if (!sb || !club || !user || user.id !== club.owner_id) return;
    if (!file.type.startsWith('image/')) {
      showToast('Use a JPG, PNG, or WebP image', 'info');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Cover photo must be under 5 MB', 'info');
      return;
    }
    setBannerUploading(true);
    try {
      const extRaw = file.name.split('.').pop()?.toLowerCase();
      const safeExt =
        extRaw === 'png' || extRaw === 'webp' || extRaw === 'jpg' || extRaw === 'jpeg' ? extRaw : 'jpg';
      const path = `${club.id}/banner-${Date.now()}.${safeExt}`;
      const { error: upErr } = await sb.storage.from('club-banners').upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = sb.storage.from('club-banners').getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: dbErr } = await sb.from('clubs').update({ banner_image: url }).eq('id', club.id);
      if (dbErr) throw dbErr;
      setEditForm((f) => ({ ...f, banner_image: url }));
      setClub((c) => (c ? { ...c, banner_image: url } : c));
      await fetchClub();
      showToast('Cover photo saved', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setBannerUploading(false);
    }
  }

  const {
    inputRef: logoInputRef,
    handleInputChange: handleLogoInputChange,
    open: openLogoPicker,
  } = useImagePicker((file) => uploadClubLogoFile(file), (m) => showToast(m, 'error'));

  const {
    inputRef: bannerInputRef,
    handleInputChange: handleBannerInputChange,
    open: openBannerPicker,
  } = useImagePicker((file) => uploadClubBannerFile(file), (m) => showToast(m, 'error'));

  async function saveClubEdits() {
    if (!sb || !club || !user || user.id !== club.owner_id) return;
    const name = editForm.name.trim();
    const location = editForm.location.trim();
    if (!name || !location) {
      showToast('Name and location are required', 'info');
      return;
    }
    setEditSaving(true);
    try {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const website = editForm.website.trim() || null;
      const instagram = normalizeInstagram(editForm.instagram) || null;
      const logo = editForm.logo.trim() || null;
      if (!website && !instagram) {
        showToast('Add a website or Instagram so people can find your club', 'info');
        setEditSaving(false);
        return;
      }
      const { error } = await sb
        .from('clubs')
        .update({
          name,
          slug: slug || club.slug,
          description: editForm.description.trim(),
          location,
          website,
          instagram,
          logo,
          banner_image: editForm.banner_image.trim() || null,
        })
        .eq('id', club.id);
      if (error) throw error;
      showToast('Club updated', 'success');
      setEditOpen(false);
      await fetchClub();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not update club', 'error');
    } finally {
      setEditSaving(false);
    }
  }

  async function joinClub() {
    if (!user) {
      router.push('/login');
      return;
    }

    setJoining(true);
    if (!sb || !clubId) {
      setJoining(false);
      return;
    }
    // Membership is approval-based: user creates a pending request.
    let desiredStatus: 'pending' | 'approved' = 'pending';
    try {
      const { data: me } = await sb.from('users').select('role').eq('id', user.id).maybeSingle();
      const meRow = me as { role?: string } | null;
      const r = String(meRow?.role ?? '').trim().toLowerCase();
      if (r === 'owner' || r === 'admin') desiredStatus = 'approved';
    } catch {
      desiredStatus = 'pending';
    }

    const { error } = await sb.from('club_members').insert({
      club_id: clubId,
      user_id: user.id,
      role: 'member',
      status: desiredStatus,
    });

    setJoining(false);
    if (!error) {
      setIsPending(desiredStatus === 'pending');
      setIsMember(desiredStatus === 'approved');
      fetchMembers();
    }
  }

  async function approveMember(memberId: string) {
    if (!sb || !clubId || !user || !club || user.id !== club.owner_id) return;
    try {
      const { error } = await sb
        .from('club_members')
        .update({ status: 'approved', role: 'member' })
        .eq('id', memberId)
        .eq('club_id', clubId);
      if (error) throw error;
      showToast('Member approved', 'success');
      fetchMembers();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not approve member', 'error');
    }
  }

  async function deleteClub() {
    if (!sb || !club || !user || user.id !== club.owner_id) return;
    if (
      !window.confirm(
        'Delete this club permanently? Linked runs and garage photos will be removed or unlinked. This cannot be undone.'
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const { error } = await sb.from('clubs').delete().eq('id', club.id);
      if (error) throw error;
      showToast('Club deleted', 'success');
      router.push('/clubs/');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not delete club', 'error');
    } finally {
      setDeleting(false);
    }
  }

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-500/20 text-green-600 dark:text-green-400';
      case 'Moderate':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'Challenging':
        return 'bg-primary/20 text-primary dark:text-primary/90';
      case 'Extreme':
        return 'bg-red-500/20 text-red-600 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Club not found</div>
      </div>
    );
  }

  const isClubOwner = !!user && user.id === club.owner_id;
  const canGarageUpload = !!user && (isMember || isClubOwner);
  const ig = instagramHref(club.instagram);
  const web = websiteHref(club.website);

  return (
    <div className="min-h-screen bg-background pb-safe-nav">
      <div className="max-w-4xl mx-auto">
        {/* Cover / background photo */}
        <div className="relative h-44 sm:h-52 md:h-56 overflow-hidden border-b border-border bg-muted">
          <ClubHeroRotator
            bannerImage={club.banner_image}
            garagePhotoUrls={garageHeroUrls}
            alt={`${club.name} cover`}
          />
          {!club.banner_image && garageHeroUrls.length === 0 ? (
            <div
              className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950"
              aria-hidden
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
          {isClubOwner && (
            <>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={bannerUploading}
                onChange={handleBannerInputChange}
              />
              <button
                type="button"
                disabled={bannerUploading}
                onClick={() => void openBannerPicker()}
                className="absolute bottom-3 right-3 sm:right-6 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background/85 backdrop-blur-sm border border-border text-xs font-semibold text-foreground cursor-pointer hover:bg-background transition disabled:opacity-50"
              >
                {bannerUploading ? (
                  <Loader2 size={14} className="animate-spin shrink-0" />
                ) : (
                  <Camera size={14} className="shrink-0" />
                )}
                {club.banner_image ? 'Change cover photo' : 'Add cover photo'}
              </button>
            </>
          )}
        </div>

        {/* Logo overlapping cover */}
        <div className="px-4 sm:px-6 lg:px-8 flex items-end gap-4 -mt-10 relative z-10 pb-4">
          <div className="relative shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-card border-4 border-background shadow-lg overflow-hidden flex items-center justify-center text-3xl">
              {club.logo ? (
                <img src={club.logo} alt={club.name} className="w-full h-full object-cover" />
              ) : (
                <span aria-hidden>🏢</span>
              )}
              {logoUploading && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <Loader2 size={22} className="animate-spin text-primary" />
                </div>
              )}
            </div>
            {isClubOwner && (
              <>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={logoUploading}
                  onChange={handleLogoInputChange}
                />
                <button
                  type="button"
                  disabled={logoUploading}
                  onClick={() => void openLogoPicker()}
                  aria-label="Change club photo"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer border-2 border-background shadow-md hover:bg-primary/90 transition disabled:opacity-50"
                >
                  <Camera size={14} className="text-primary-foreground" />
                </button>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{club.name}</h1>
              {club.verified && (
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs sm:text-sm rounded">
                  ✓ Verified
                </span>
              )}
              {club.premium && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs sm:text-sm rounded">
                  ⭐ Premium
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{club.location}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Link href="/clubs/" className="inline-block text-sm text-primary hover:underline mb-4">
          ← Back to clubs
        </Link>
        <p className="text-xs text-muted-foreground mb-4 max-w-2xl">
          This is the club&apos;s <span className="text-foreground font-medium">organizational</span> page — separate from any
          member&apos;s personal profile. Runs and the garage can reference this club without replacing your own account.
        </p>

        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            {web && (
              <a href={web} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-semibold">
                🌐 Website
              </a>
            )}
            {ig && (
              <a href={ig} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-semibold">
                📸 Instagram
              </a>
            )}
          </div>

          {club.description && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-foreground/90">{club.description}</p>
            </div>
          )}

          {isClubOwner && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <button
                type="button"
                onClick={() => setEditOpen((o) => !o)}
                className="w-full py-2.5 flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 text-foreground text-sm font-semibold hover:bg-muted transition"
              >
                <Pencil size={16} />
                {editOpen ? 'Close editor' : 'Edit club info'}
              </button>
              {editOpen && (
                <div className="space-y-3 text-left">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Club name</label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Location</label>
                    <input
                      value={editForm.location}
                      onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm resize-y min-h-[96px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Website URL</label>
                    <input
                      value={editForm.website}
                      onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Instagram</label>
                    <input
                      value={editForm.instagram}
                      onChange={(e) => setEditForm((f) => ({ ...f, instagram: e.target.value }))}
                      placeholder="@handle or URL"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Club photo / logo
                    </label>
                    {editForm.logo ? (
                      <img
                        src={editForm.logo}
                        alt="Club logo preview"
                        className="w-16 h-16 rounded-xl object-cover border border-border mb-2"
                      />
                    ) : null}
                    {isCapacitorNative() ? (
                      <button
                        type="button"
                        disabled={logoUploading || editSaving}
                        onClick={() => void openLogoPicker()}
                        className="w-full py-2.5 px-3 rounded-lg bg-muted text-sm font-semibold text-foreground disabled:opacity-50"
                      >
                        Take photo or choose image
                      </button>
                    ) : (
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={logoUploading || editSaving}
                        onChange={handleLogoInputChange}
                        className="w-full text-sm text-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-muted file:text-foreground"
                      />
                    )}
                    <input
                      value={editForm.logo}
                      onChange={(e) => setEditForm((f) => ({ ...f, logo: e.target.value }))}
                      placeholder="Or paste image URL (save below)"
                      className="w-full px-3 py-2 mt-2 bg-background border border-border rounded-lg text-foreground text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Upload saves immediately. URL-only changes apply when you tap Save changes.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Cover photo / background
                    </label>
                    {editForm.banner_image ? (
                      <img
                        src={editForm.banner_image}
                        alt="Cover preview"
                        className="w-full max-h-32 rounded-xl object-cover border border-border mb-2"
                      />
                    ) : (
                      <p className="text-[11px] text-muted-foreground mb-2">
                        No cover yet — use &quot;Add cover photo&quot; at the top of this page, or upload below.
                      </p>
                    )}
                    {isCapacitorNative() ? (
                      <button
                        type="button"
                        disabled={bannerUploading || editSaving}
                        onClick={() => void openBannerPicker()}
                        className="w-full py-2.5 px-3 rounded-lg bg-muted text-sm font-semibold text-foreground disabled:opacity-50"
                      >
                        Take photo or choose cover image
                      </button>
                    ) : (
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={bannerUploading || editSaving}
                        onChange={handleBannerInputChange}
                        className="w-full text-sm text-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-muted file:text-foreground"
                      />
                    )}
                    <input
                      value={editForm.banner_image}
                      onChange={(e) => setEditForm((f) => ({ ...f, banner_image: e.target.value }))}
                      placeholder="Or paste image URL (save below)"
                      className="w-full px-3 py-2 mt-2 bg-background border border-border rounded-lg text-foreground text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Shown behind your club logo and on club cards in the directory. Upload saves immediately.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={editSaving}
                    onClick={() => void saveClubEdits()}
                    className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {editSaving ? <Loader2 size={18} className="animate-spin" /> : null}
                    Save changes
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={joinClub}
            disabled={joining || isMember || isPending}
            className="mt-6 w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition disabled:opacity-50 disabled:bg-muted"
          >
            {joining
              ? 'Requesting…'
              : isMember
                ? '✓ Member'
                : isPending
                  ? 'Request pending'
                  : 'Request to join'}
          </button>

          {isClubOwner && (
            <button
              type="button"
              onClick={() => void deleteClub()}
              disabled={deleting}
              className="mt-3 w-full py-3 flex items-center justify-center gap-2 rounded-lg border border-red-500/60 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-semibold transition disabled:opacity-50"
            >
              <Trash2 size={18} />
              {deleting ? 'Deleting…' : 'Delete club'}
            </button>
          )}
        </div>

        {isClubOwner && (
          <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Membership requests</h2>
              <p className="text-xs text-muted-foreground mt-1">Approve pending join requests to allow members to host official club runs.</p>
            </div>
            <div className="p-4 space-y-3">
              {members.filter((m) => String(m.status ?? '').toLowerCase() === 'pending').length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests.</p>
              ) : (
                members
                  .filter((m) => String(m.status ?? '').toLowerCase() === 'pending')
                  .map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground font-medium truncate">{m.user?.name ?? 'Member'}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.user_id}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void approveMember(m.id)}
                        className="shrink-0 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                      >
                        Approve
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {clubId && (
          <ClubGarage
            clubId={clubId}
            currentUserId={user?.id ?? null}
            canUpload={canGarageUpload}
            isClubOwner={isClubOwner}
            onPhotosChanged={() => void fetchGarageHeroPhotos()}
          />
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Upcoming Runs</h2>
              {isMember && clubId ? (
                <Link
                  href={`/clubs/${clubId}/chat/`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary/90 hover:text-primary/80"
                >
                  <MessageCircle size={16} />
                  Club chat
                </Link>
              ) : null}
            </div>
          </div>

          <div className="p-4">
            {runs.length > 0 ? (
              <div className="space-y-3">
                {runs.map((run) => (
                  <a
                    key={run.id}
                    href={`/runs/${run.id}`}
                    className="block p-3 bg-muted rounded-lg hover:bg-muted/80 border border-border transition"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-foreground font-medium">{run.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs shrink-0 ${getDifficultyColor(run.difficulty)}`}>
                        {run.difficulty}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{new Date(run.date).toLocaleDateString()}</div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">No upcoming runs scheduled</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Members ({approvedMembers.length})</h2>
          </div>

          <div className="p-4">
            {approvedMembers.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {approvedMembers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-2 p-2 bg-muted rounded-lg border border-border">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold shrink-0">
                      {member.user?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-foreground text-sm truncate">{member.user?.name || 'Unknown'}</div>
                      <div className="text-muted-foreground text-xs capitalize">{member.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">No members yet</div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
