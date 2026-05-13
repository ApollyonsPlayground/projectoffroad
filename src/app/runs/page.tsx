'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Users,
  ChevronRight,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Zap,
  X,
  Flag,
  Shield,
  Radio,
} from 'lucide-react';

import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { RunListSkeleton } from '@/components/SkeletonLoader';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { HostRunWizard } from '@/components/runs/HostRunWizard';
import { mapDbTrailRow } from '@/lib/trails/mapDbTrail';
import { ensureStoragePublicObjectUrl } from '@/lib/supabase/storagePublicUrl';

/** When a run has no trail photo yet */
const RUN_CARD_FALLBACK_IMG =
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80';

interface Run {
  id: string;
  title: string;
  description: string;
  date: string;
  meetup_location: string;
  difficulty: string;
  max_participants: number | null;
  vehicle_requirements?: string | null;
  comms_note?: string | null;
  status: string;
  club_id?: string | null;
  trail_id?: string | null;
  host_id?: string | null;
  host_display_name?: string | null;
  run_source?: 'club_official' | 'user_submitted' | null;
  flyer_image?: string | null;
  club?: { name: string; verified?: boolean; banner_image?: string | null } | null;
  trail?: { name: string; difficulty: string; photo_url?: string | null } | null;
}

// ─── HostRunDrawer ────────────────────────────────────────────────────────────
function HostRunDrawer({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="fixed bottom-0 left-0 right-0 z-[9991] max-w-app-shell mx-auto bg-zinc-950 border border-zinc-800 rounded-t-2xl max-h-[92dvh] flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Flag size={16} className="text-orange-500" />
                <h2 className="text-[16px] font-black text-white">Host a Run</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors touch-manipulation"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <HostRunWizard
                variant="drawer"
                onSuccess={() => {
                  onSuccess();
                  onClose();
                }}
                onCancel={onClose}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function getDifficultyColor(difficulty: string): string {
  const level = (difficulty ?? '').toLowerCase();
  if (level === 'beginner' || level === 'easy') return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
  if (level === 'moderate' || level === 'intermediate') return 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30';
  if (level === 'advanced' || level === 'challenging') return 'bg-orange-500/15 text-orange-400 border border-orange-500/30';
  if (level === 'extreme') return 'bg-red-500/15 text-red-400 border border-red-500/30';
  return 'bg-zinc-700/50 text-zinc-400';
}

function formatRunDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (days === 0) return `Today at ${time}`;
  if (days === 1) return `Tomorrow at ${time}`;
  if (days < 7) return `In ${days} days · ${time}`;
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${time}`;
}

function RunCard({
  run,
  index,
  joined,
  joining,
  participantCount,
  onRsvp,
  currentUserId,
}: {
  run: Run;
  index: number;
  joined: boolean;
  joining: boolean;
  participantCount: number;
  onRsvp: (run: Run) => void;
  currentUserId: string | null;
}) {
  const isHost = Boolean(currentUserId && run.host_id === currentUserId);
  const isFull = run.max_participants != null && participantCount >= run.max_participants;
  const spotsLeft = run.max_participants != null ? run.max_participants - participantCount : null;
  const isAlmostFull = spotsLeft != null && spotsLeft <= 3 && spotsLeft > 0;

  const clubBannerRaw =
    run.run_source === 'club_official' &&
    run.club?.banner_image &&
    String(run.club.banner_image).trim()
      ? String(run.club.banner_image).trim()
      : '';
  const clubBanner = clubBannerRaw
    ? ensureStoragePublicObjectUrl(clubBannerRaw) || clubBannerRaw
    : '';
  const flyerRaw =
    run.flyer_image != null && String(run.flyer_image).trim() ? String(run.flyer_image).trim() : '';
  const flyerUrl = flyerRaw ? ensureStoragePublicObjectUrl(flyerRaw) || flyerRaw : '';
  const trailPhoto =
    flyerUrl ||
    clubBanner ||
    (run.trail?.photo_url && String(run.trail.photo_url).trim()) ||
    RUN_CARD_FALLBACK_IMG;

  return (
    <motion.article
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-orange-500/40 transition-colors"
    >
      {/* Trail imagery + trail name (same catalog as Trail Explorer) */}
      <div className="relative h-[132px] bg-zinc-800 shrink-0">
        <img
          src={trailPhoto}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-zinc-950/15" />
        <div className="absolute bottom-2.5 left-3 right-3">
          {run.trail?.name ? (
            <>
              <p className="text-[16px] font-black text-white leading-tight drop-shadow-[0_1px_8px_rgba(0,0,0,0.85)]">
                {run.trail.name}
              </p>
              <p className="text-[12px] font-semibold text-orange-300/95 mt-1 truncate drop-shadow-md">
                {run.title}
              </p>
            </>
          ) : (
            <>
              <p className="text-[16px] font-black text-white leading-tight drop-shadow-[0_1px_8px_rgba(0,0,0,0.85)]">
                {run.title}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Meetup / trail TBD</p>
            </>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              {!run.trail?.name ? (
                <h3 className="font-bold text-white text-[15px] leading-snug">{run.title}</h3>
              ) : null}
              {run.run_source === 'user_submitted' && (
                <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/35">
                  Community
                </span>
              )}
              {run.run_source === 'club_official' && (
                <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Club
                </span>
              )}
            </div>
            {run.club?.name && (
              <p className="text-[12px] text-orange-500 font-semibold">{run.club.name}</p>
            )}
            {run.run_source === 'club_official' && !run.club?.name && (
              <p className="text-[12px] text-emerald-400/95 font-semibold">Staff verified</p>
            )}
            {run.trail?.name && (
              <p className="text-[12px] text-zinc-400 mt-0.5 truncate">
                Trail · <span className="text-zinc-300 font-medium">{run.trail.name}</span>
              </p>
            )}
            {run.host_id && (
              <Link
                href={`/profile/${run.host_id}`}
                className="text-[12px] text-zinc-500 hover:text-orange-400 mt-0.5 inline-block font-medium"
              >
                Organizer: {run.host_display_name ?? 'View profile'}
              </Link>
            )}
          </div>
          <span className={`flex-shrink-0 px-2 py-1 text-[11px] font-bold uppercase rounded-lg ${getDifficultyColor(run.difficulty)}`}>
            {run.difficulty}
          </span>
        </div>

        {/* Description */}
        <p className="text-[13px] text-zinc-400 leading-relaxed line-clamp-2 mb-3">
          {run.description}
        </p>

        {/* Details */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-[13px] text-zinc-500">
            <Calendar size={13} className="text-orange-500 flex-shrink-0" />
            <span>{formatRunDate(run.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-zinc-500">
            <MapPin size={13} className="text-orange-500 flex-shrink-0" />
            <span className="truncate">{run.meetup_location}</span>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <Users size={13} className="text-orange-500 flex-shrink-0" />
            <span className={isAlmostFull ? 'text-orange-400' : isFull ? 'text-red-400' : 'text-zinc-500'}>
              {participantCount}{run.max_participants != null ? `/${run.max_participants}` : ''} joined
              {isAlmostFull && ' · Almost full!'}
              {isFull && ' · Full'}
            </span>
          </div>
          {run.comms_note && String(run.comms_note).trim() && (
            <div className="flex items-start gap-2 text-[13px]">
              <Radio size={13} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <span className="text-zinc-300 leading-snug break-words">{run.comms_note}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/runs/${run.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[13px] font-semibold rounded-lg transition-colors"
          >
            Details
            <ChevronRight size={14} />
          </Link>
          {isHost ? (
            <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold rounded-lg border border-orange-500/35 bg-orange-500/10 text-orange-300">
              <Shield size={14} className="text-orange-400 flex-shrink-0" />
              {"You're hosting"}
            </div>
          ) : (
            <button
              onClick={() => onRsvp(run)}
              disabled={(isFull && !joined) || joining}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold rounded-lg transition-colors ${
                joined
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : isFull
                  ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-black'
              }`}
            >
              {joining ? (
                <Loader2 size={14} className="animate-spin" />
              ) : joined ? (
                <><CheckCircle2 size={14} /> Joined</>
              ) : (
                <><Zap size={14} /> Join Run</>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

type FilterType = 'upcoming' | 'active' | 'completed';

export default function RunsPage() {
  const { user, supabaseClient } = useAuth();
  const { showToast } = useToast();

  const [runs, setRuns] = useState<Run[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [hostDrawerOpen, setHostDrawerOpen] = useState(false);
  // Set of run IDs the current user has RSVP'd to
  const [joinedRunIds, setJoinedRunIds] = useState<Set<string>>(new Set());
  // Per-run participant counts
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  // Which run ID is currently being joined/unjoined
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    if (!supabaseClient) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // `*` first avoids 400 spam when FK embeds (`club:clubs`, `trail:trails`) are not in PostgREST schema cache.
      // Narrow selects follow for nicer payloads when embeds exist.
      const selectAttempts = [
        '*',
        'id, title, description, date, meetup_location, difficulty, max_participants, vehicle_requirements, status, club_id',
        'id, title, description, date, meetup_location, difficulty, max_participants, vehicle_requirements, status, club_id, trail_id',
        'id, title, description, date, meetup_location, difficulty, max_participants, vehicle_requirements, status, club_id, trail_id, run_source, host_id, flyer_image',
        'id, title, description, date, meetup_location, difficulty, max_participants, vehicle_requirements, status, club_id, run_source, host_id, flyer_image',
        'id, title, description, date, meetup_location, difficulty, max_participants, vehicle_requirements, status, club_id, club:clubs(name)',
        'id, title, description, date, meetup_location, difficulty, max_participants, vehicle_requirements, status, club_id, club:clubs(name), trail:trails(name, difficulty)',
        'id, title, description, date, meetup_location, difficulty, max_participants, vehicle_requirements, status, club_id, run_source, host_id, flyer_image, club:clubs(name), trail:trails(name, difficulty)',
      ];

      let runsData: Run[] | null = null;
      let runsError: Error | null = null;
      for (const sel of selectAttempts) {
        const res = await supabaseClient
          .from('runs')
          .select(sel)
          .eq('status', filter)
          .eq('visibility', 'public')
          .order('date', { ascending: true });
        if (!res.error) {
          runsData = (res.data ?? []) as unknown as Run[];
          runsError = null;
          break;
        }
        runsError = res.error as unknown as Error;
      }
      if (runsError || runsData == null) throw runsError ?? new Error('runs fetch failed');

      const fetchedRuns = runsData;

      const trailIds = [
        ...new Set(fetchedRuns.map((r) => String(r.trail_id ?? '').trim()).filter(Boolean)),
      ];
      const trailById: Record<string, { name: string; difficulty: string; photo_url: string | null }> = {};
      if (trailIds.length) {
        const tr = await supabaseClient.from('trails').select('*').in('id', trailIds);
        if (!tr.error && tr.data) {
          for (const row of tr.data as Record<string, unknown>[]) {
            const m = mapDbTrailRow(row);
            trailById[m.id] = {
              name: m.name,
              difficulty: m.difficulty,
              photo_url: m.image ?? null,
            };
          }
        }
      }

      const hostIds = [...new Set(fetchedRuns.map((r) => r.host_id).filter(Boolean))] as string[];
      const hostNameById: Record<string, string> = {};
      if (hostIds.length) {
        const { data: hostRows } = await supabaseClient.from('users').select('id, name').in('id', hostIds);
        if (hostRows) {
          for (const row of hostRows as { id: string; name: string | null }[]) {
            hostNameById[row.id] = String(row.name ?? '').trim() || 'Organizer';
          }
        }
      }

      const clubIds = [
        ...new Set(fetchedRuns.map((r) => String(r.club_id ?? '').trim()).filter(Boolean)),
      ];
      const clubById: Record<string, { name: string; verified: boolean; banner_image: string | null }> = {};
      if (clubIds.length) {
        const cr = await supabaseClient
          .from('clubs')
          .select('id, name, verified, banner_image')
          .in('id', clubIds);
        if (!cr.error && cr.data) {
          for (const row of cr.data as { id: string; name: string | null; verified?: boolean | null; banner_image?: string | null }[]) {
            clubById[String(row.id)] = {
              name: String(row.name ?? 'Club').trim() || 'Club',
              verified: Boolean(row.verified),
              banner_image:
                row.banner_image != null && String(row.banner_image).trim()
                  ? String(row.banner_image).trim()
                  : null,
            };
          }
        }
      }

      const enriched = fetchedRuns.map((r) => {
        const tid = r.trail_id ? String(r.trail_id).trim() : '';
        const fromDb = tid ? trailById[tid] : undefined;
        const embedded = r.trail as { name?: string; difficulty?: string; photo_url?: string | null } | null | undefined;
        const mergedTrail =
          fromDb != null
            ? {
                name: fromDb.name,
                difficulty: fromDb.difficulty,
                photo_url: fromDb.photo_url,
              }
            : embedded && embedded.name
              ? {
                  name: embedded.name,
                  difficulty: String(embedded.difficulty ?? ''),
                  photo_url: embedded.photo_url ?? null,
                }
              : null;

        const cid = r.club_id ? String(r.club_id).trim() : '';
        const fromClubDb = cid ? clubById[cid] : undefined;
        const embeddedClub = r.club as { name?: string; verified?: boolean; banner_image?: string | null } | null | undefined;
        const mergedClub =
          fromClubDb != null
            ? { name: fromClubDb.name, verified: fromClubDb.verified, banner_image: fromClubDb.banner_image }
            : embeddedClub && embeddedClub.name
              ? {
                  name: String(embeddedClub.name),
                  verified: Boolean(embeddedClub.verified),
                  banner_image:
                    embeddedClub.banner_image != null && String(embeddedClub.banner_image).trim()
                      ? String(embeddedClub.banner_image).trim()
                      : null,
                }
              : null;

        return {
          ...r,
          // If a club is verified now, its runs should display as official even if they were created
          // before verification. (Admin verification also backfills DB, but this keeps UI correct regardless.)
          run_source: cid && Boolean(fromClubDb?.verified ?? embeddedClub?.verified) ? 'club_official' : (r.run_source ?? null),
          trail: mergedTrail,
          club: mergedClub,
          host_display_name: r.host_id ? hostNameById[r.host_id] ?? null : null,
        };
      });
      setRuns(enriched);

      if (enriched.length === 0) return;

      // Batch fetch participant counts and user's own RSVPs in parallel
      const runIds = enriched.map((r) => r.id);
      const [countsRes, joinedRes] = await Promise.all([
        supabaseClient
          .from('run_participants')
          .select('run_id')
          .in('run_id', runIds),
        user
          ? supabaseClient
              .from('run_participants')
              .select('run_id')
              .in('run_id', runIds)
              .eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
      ]);

      // Build counts map
      const counts: Record<string, number> = {};
      runIds.forEach((id) => (counts[id] = 0));
      (countsRes.data ?? []).forEach((r: any) => {
        counts[r.run_id] = (counts[r.run_id] ?? 0) + 1;
      });
      setParticipantCounts(counts);
      setJoinedRunIds(new Set((joinedRes.data ?? []).map((r: any) => r.run_id)));
    } catch {
      showToast('Could not load runs', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, user, filter]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleRsvp = useCallback(async (run: Run) => {
    if (!user) {
      showToast('Sign in to join a run', 'info');
      return;
    }
    if (!supabaseClient) return;
    if (run.host_id === user.id) {
      showToast('You\'re hosting this run — no need to join', 'info');
      return;
    }
    setJoiningId(run.id);
    const alreadyJoined = joinedRunIds.has(run.id);
    try {
      if (alreadyJoined) {
        const { error } = await supabaseClient
          .from('run_participants')
          .delete()
          .match({ run_id: run.id, user_id: user.id });
        if (error) {
          showToast(error.message || 'Could not leave run', 'error');
          return;
        }
        setJoinedRunIds((prev) => { const next = new Set(prev); next.delete(run.id); return next; });
        setParticipantCounts((prev) => ({ ...prev, [run.id]: Math.max(0, (prev[run.id] ?? 1) - 1) }));
        showToast('You have left the run', 'info');
      } else {
        const { error } = await supabaseClient
          .from('run_participants')
          .insert({ run_id: run.id, user_id: user.id, rsvp_status: 'going' });
        if (error && error.code !== '23505') {
          showToast(error.message || 'Could not join run', 'error');
          return;
        }
        setJoinedRunIds((prev) => new Set([...prev, run.id]));
        setParticipantCounts((prev) => ({ ...prev, [run.id]: (prev[run.id] ?? 0) + 1 }));
        showToast(`You're in for "${run.title}"!`, 'success');
      }
    } finally {
      setJoiningId(null);
    }
  }, [user, supabaseClient, joinedRunIds, showToast]);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-zinc-900 safe-top">
        <div className="px-4 py-3 max-w-app-shell mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[20px] font-black text-white">Runs</h1>
            {user && (
              <button
                onClick={() => setHostDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-[13px] font-bold rounded-lg transition-colors"
              >
                <Plus size={15} />
                Host a Run
              </button>
            )}
          </div>
          {/* Filter tabs */}
          <div className="flex gap-2">
            {(['upcoming', 'active', 'completed'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                  filter === f ? 'bg-orange-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Safety notice */}
      <div className="px-4 py-2.5 bg-orange-500/10 border-b border-orange-500/20">
        <div className="flex items-center gap-2 text-orange-500 max-w-app-shell mx-auto">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <p className="text-[12px] font-medium">Always bring recovery gear and communicate with your group.</p>
        </div>
      </div>

      {/* Run list */}
      <main className="max-w-app-shell mx-auto px-4 pt-4 pb-28">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RunListSkeleton count={3} />
            </motion.div>
          ) : runs.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <Calendar size={44} className="mx-auto text-zinc-800 mb-3" />
              <h3 className="text-[16px] font-bold text-zinc-400 mb-1">No {filter} runs</h3>
              <p className="text-[13px] text-zinc-600 mb-6">Be the first to organize one</p>
              {user && (
                <button
                  onClick={() => setHostDrawerOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-black text-[13px] font-bold rounded-xl transition-colors"
                >
                  <Plus size={15} />
                  Host a Run
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div key="runs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <p className="text-[13px] text-zinc-600">
                {runs.length} {filter} run{runs.length !== 1 ? 's' : ''}
              </p>
              {runs.map((run, i) => (
                <RunCard
                  key={run.id}
                  run={run}
                  index={i}
                  joined={joinedRunIds.has(run.id)}
                  joining={joiningId === run.id}
                  participantCount={participantCounts[run.id] ?? 0}
                  currentUserId={user?.id ?? null}
                  onRsvp={handleRsvp}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />

      {/* Host a Run drawer */}
      <HostRunDrawer
        open={hostDrawerOpen}
        onClose={() => setHostDrawerOpen(false)}
        onSuccess={fetchRuns}
      />
    </div>
  );
}
