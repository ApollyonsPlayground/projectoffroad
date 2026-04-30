'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  Mountain,
  ChevronDown,
  Flag,
  Search,
  Check,
  PlusCircle,
} from 'lucide-react';

import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { RunListSkeleton } from '@/components/SkeletonLoader';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';

interface Run {
  id: string;
  title: string;
  description: string;
  date: string;
  meetup_location: string;
  difficulty: string;
  max_participants: number | null;
  vehicle_requirements?: string | null;
  status: string;
  club_id?: string | null;
  trail_id?: string | null;
  host_id?: string | null;
  club?: { name: string } | null;
  trail?: { name: string; difficulty: string } | null;
}

interface Club {
  id: string;
  name: string;
}

interface Trail {
  id: string;
  name: string;
  location: string | null;
  difficulty: string | null;
}

// ─── Form state type ──────────────────────────────────────────────────────────
const DIFFICULTIES = ['beginner', 'moderate', 'advanced', 'extreme'] as const;

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  meetup_location: '',
  max_participants: '',
  difficulty: 'moderate' as string,
  club_id: '',
  trail_id: '',
};

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
  const router = useRouter();
  const { user, supabaseClient } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [clubs, setClubs] = useState<Club[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Trail Combobox state
  const [trailSearch, setTrailSearch] = useState('');
  const [trailComboOpen, setTrailComboOpen] = useState(false);
  const [customTrailName, setCustomTrailName] = useState('');
  const [showCustomTrailInput, setShowCustomTrailInput] = useState(false);

  // Fetch clubs + trails when drawer opens
  useEffect(() => {
    if (!open || !supabaseClient || !user) return;
    setLoadingDropdowns(true);

    // Fetch clubs where user is owner or admin
    supabaseClient
      .from('club_members')
      .select('club_id, clubs(id, name)')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .then(({ data: membersData }) => {
        const clubList: Club[] = (membersData ?? [])
          .map((r: any) => r.clubs)
          .filter(Boolean)
          .reduce((acc: Club[], c: Club) => {
            if (!acc.find((x) => x.id === c.id)) acc.push(c);
            return acc;
          }, []);
        setClubs(clubList);
      });

    // Fetch trails — try with is_active filter first, fallback to all trails
    supabaseClient
      .from('trails')
      .select('id, name, location, difficulty')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          // Fallback: fetch all trails without is_active filter (column may not exist)
          supabaseClient
            .from('trails')
            .select('id, name, location, difficulty')
            .order('name', { ascending: true })
            .then(({ data: fallbackData }) => {
              setTrails((fallbackData ?? []) as Trail[]);
              setLoadingDropdowns(false);
            });
        } else {
          setTrails(data as Trail[]);
          setLoadingDropdowns(false);
        }
      });
  }, [open, supabaseClient, user]);

  const set = (key: keyof typeof EMPTY_FORM) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabaseClient) return;
    if (!form.title.trim() || !form.date || !form.meetup_location.trim()) {
      showToast('Please fill in Title, Date, and Meetup Location', 'error');
      return;
    }
    setSubmitting(true);

    // Determine if this is a custom trail suggestion
    const isCustomTrail = showCustomTrailInput && customTrailName.trim();

    // Build payload matching exact schema
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      date: new Date(form.date).toISOString(),
      meetup_location: form.meetup_location.trim(),
      max_riders: form.max_participants ? parseInt(form.max_participants, 10) : null,
      difficulty: form.difficulty,
      host_id: user.id,
      trail_id: isCustomTrail ? null : (form.trail_id || null),
      trail_name_custom: isCustomTrail ? customTrailName.trim() : null,
      status: isCustomTrail ? 'pending_approval' : 'upcoming',
    };

    try {
      const { data, error } = await supabaseClient.from('runs').insert(payload).select('id').single();

      if (error) {
        console.error('[HostRunDrawer] Insert error:', error);
        showToast(`Failed to create run: ${error.message}`, 'error');
        return;
      }

      const newRunId = data?.id;
      showToast('Run created!', 'success');
      setForm({ ...EMPTY_FORM });
      setCustomTrailName('');
      setShowCustomTrailInput(false);
      setTrailSearch('');
      onSuccess();
      onClose();

      // Redirect to the new run's detail page
      if (newRunId) {
        router.push(`/runs/${newRunId}`);
      }
    } catch (err: unknown) {
      console.error('[HostRunDrawer] Unexpected error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create run. Check database columns.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-[14px] text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/60 transition-colors';
  const labelClass = 'block text-[12px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="fixed bottom-0 left-0 right-0 z-[9991] max-w-md mx-auto bg-zinc-950 border border-zinc-800 rounded-t-2xl max-h-[92dvh] flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle + header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Flag size={16} className="text-orange-500" />
                <h2 className="text-[16px] font-black text-white">Host a Run</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

              {/* Title */}
              <div>
                <label className={labelClass}>Title *</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Big Bear Shakedown Run"
                  value={form.title}
                  onChange={set('title')}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="What to expect, trail conditions, bring-list..."
                  value={form.description}
                  onChange={set('description')}
                />
              </div>

              {/* Date / Time */}
              <div>
                <label className={labelClass}>Date & Time *</label>
                <input
                  type="datetime-local"
                  className={`${inputClass} [color-scheme:dark]`}
                  value={form.date}
                  onChange={set('date')}
                  required
                />
              </div>

              {/* Meetup Location */}
              <div>
                <label className={labelClass}>Meetup Location *</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Forest Falls Trailhead Parking Lot"
                  value={form.meetup_location}
                  onChange={set('meetup_location')}
                  required
                />
              </div>

              {/* Difficulty + Max Participants (side by side) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Difficulty</label>
                  <div className="relative">
                    <select
                      className={`${inputClass} appearance-none pr-8`}
                      value={form.difficulty}
                      onChange={set('difficulty')}
                    >
                      {DIFFICULTIES.map((d) => (
                        <option key={d} value={d} className="bg-zinc-900 capitalize">
                          {d.charAt(0).toUpperCase() + d.slice(1)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Max Riders</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    className={inputClass}
                    placeholder="No limit"
                    value={form.max_participants}
                    onChange={set('max_participants')}
                  />
                </div>
              </div>

              {/* Club dropdown */}
              <div>
                <label className={labelClass}>
                  Hosting Club
                  {loadingDropdowns && <Loader2 size={11} className="inline ml-1.5 animate-spin text-zinc-500" />}
                </label>
                <div className="relative">
                  <select
                    className={`${inputClass} appearance-none pr-8`}
                    value={form.club_id}
                    onChange={set('club_id')}
                    disabled={loadingDropdowns}
                  >
                    <option value="">No club / personal run</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id} className="bg-zinc-900">{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                </div>
                {clubs.length === 0 && !loadingDropdowns && (
                  <p className="text-[11px] text-zinc-600 mt-1">You need owner/admin role in a club to host under it.</p>
                )}
              </div>

              {/* Trail Searchable Combobox */}
              <div>
                <label className={labelClass}>
                  <Mountain size={11} className="inline mr-1" />
                  Trail
                </label>
                {showCustomTrailInput ? (
                  // Custom trail input mode
                  <div className="space-y-2">
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Type new trail name..."
                      value={customTrailName}
                      onChange={(e) => setCustomTrailName(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomTrailInput(false);
                        setCustomTrailName('');
                      }}
                      className="text-[11px] text-orange-500 hover:text-orange-400"
                    >
                      Cancel — choose existing trail
                    </button>
                  </div>
                ) : (
                  // Searchable combobox
                  <div className="relative">
                    <div
                      className={`${inputClass} cursor-pointer flex items-center justify-between`}
                      onClick={() => setTrailComboOpen(!trailComboOpen)}
                    >
                      <span className={form.trail_id ? 'text-white' : 'text-zinc-500'}>
                        {form.trail_id
                          ? trails.find((t) => t.id === form.trail_id)?.name ?? 'Select a trail'
                          : 'Select a trail (optional)'}
                      </span>
                      <ChevronDown size={14} className={`text-zinc-500 transition-transform ${trailComboOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Dropdown */}
                    <AnimatePresence>
                      {trailComboOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden"
                        >
                          {/* Search input */}
                          <div className="p-2 border-b border-zinc-800">
                            <div className="relative">
                              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                              <input
                                type="text"
                                className="w-full pl-8 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-[13px] text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/60"
                                placeholder="Search trails..."
                                value={trailSearch}
                                onChange={(e) => setTrailSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          {/* Options list */}
                          <div className="max-h-48 overflow-y-auto">
                            {/* Clear selection option */}
                            <button
                              type="button"
                              className="w-full px-3 py-2.5 text-left text-[13px] text-zinc-400 hover:bg-zinc-800 flex items-center justify-between"
                              onClick={() => {
                                setForm((prev) => ({ ...prev, trail_id: '' }));
                                setTrailComboOpen(false);
                                setTrailSearch('');
                              }}
                            >
                              No trail selected
                              {!form.trail_id && <Check size={14} className="text-orange-500" />}
                            </button>

                            {/* Filtered trails */}
                            {trails
                              .filter((t) =>
                                t.name.toLowerCase().includes(trailSearch.toLowerCase()) ||
                                (t.location ?? '').toLowerCase().includes(trailSearch.toLowerCase())
                              )
                              .map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  className="w-full px-3 py-2.5 text-left text-[13px] text-white hover:bg-zinc-800 flex items-center justify-between"
                                  onClick={() => {
                                    // Set trail_id and auto-fill meetup_location from trail's location
                                    setForm((prev) => ({
                                      ...prev,
                                      trail_id: t.id,
                                      meetup_location: t.location ?? prev.meetup_location,
                                    }));
                                    setTrailComboOpen(false);
                                    setTrailSearch('');
                                  }}
                                >
                                  <span>
                                    {t.name}
                                    {t.location && <span className="text-zinc-500 ml-1">— {t.location}</span>}
                                  </span>
                                  {form.trail_id === t.id && <Check size={14} className="text-orange-500" />}
                                </button>
                              ))}

                            {/* Suggest new trail option */}
                            <button
                              type="button"
                              className="w-full px-3 py-2.5 text-left text-[13px] text-orange-500 hover:bg-orange-500/10 flex items-center gap-2 border-t border-zinc-800"
                              onClick={() => {
                                setShowCustomTrailInput(true);
                                setTrailComboOpen(false);
                                setForm((prev) => ({ ...prev, trail_id: '' }));
                              }}
                            >
                              <PlusCircle size={14} />
                              + Suggest a New Trail...
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 text-black disabled:text-zinc-500 text-[14px] font-black rounded-xl transition-colors"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
                {submitting ? 'Creating…' : 'Create Run'}
              </button>

              {/* Spacer so content isn't hidden behind the keyboard on mobile */}
              <div className="h-4" />
            </form>
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
}: {
  run: Run;
  index: number;
  joined: boolean;
  joining: boolean;
  participantCount: number;
  onRsvp: (run: Run) => void;
}) {
  const isFull = run.max_participants != null && participantCount >= run.max_participants;
  const spotsLeft = run.max_participants != null ? run.max_participants - participantCount : null;
  const isAlmostFull = spotsLeft != null && spotsLeft <= 3 && spotsLeft > 0;

  return (
    <motion.article
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-orange-500/40 transition-colors"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-[15px] leading-snug mb-0.5">{run.title}</h3>
            {run.club?.name && (
              <p className="text-[12px] text-orange-500 font-semibold">{run.club.name}</p>
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
          <button
            onClick={() => onRsvp(run)}
            disabled={isFull && !joined || joining}
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
      const query = supabaseClient
        .from('runs')
        .select('id, title, description, date, meetup_location, difficulty, max_participants, vehicle_requirements, status, club_id, club:clubs(name)')
        .eq('status', filter)
        .order('date', { ascending: true });

      const { data: runsData, error: runsError } = await query;
      if (runsError) throw runsError;

      const fetchedRuns = (runsData ?? []) as Run[];
      setRuns(fetchedRuns);

      if (fetchedRuns.length === 0) return;

      // Batch fetch participant counts and user's own RSVPs in parallel
      const runIds = fetchedRuns.map((r) => r.id);
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
    setJoiningId(run.id);
    const alreadyJoined = joinedRunIds.has(run.id);
    try {
      if (alreadyJoined) {
        const { error } = await supabaseClient
          .from('run_participants')
          .delete()
          .match({ run_id: run.id, user_id: user.id });
        if (error) throw error;
        setJoinedRunIds((prev) => { const next = new Set(prev); next.delete(run.id); return next; });
        setParticipantCounts((prev) => ({ ...prev, [run.id]: Math.max(0, (prev[run.id] ?? 1) - 1) }));
        showToast('You have left the run', 'info');
      } else {
        const { error } = await supabaseClient
          .from('run_participants')
          .insert({ run_id: run.id, user_id: user.id, rsvp_status: 'confirmed' });
        if (error && error.code !== '23505') throw error;
        setJoinedRunIds((prev) => new Set([...prev, run.id]));
        setParticipantCounts((prev) => ({ ...prev, [run.id]: (prev[run.id] ?? 0) + 1 }));
        showToast(`You're in for "${run.title}"!`, 'success');
      }
    } catch {
      showToast('Could not update RSVP', 'error');
    } finally {
      setJoiningId(null);
    }
  }, [user, supabaseClient, joinedRunIds, showToast]);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-zinc-900 safe-top">
        <div className="px-4 py-3 max-w-md mx-auto">
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
        <div className="flex items-center gap-2 text-orange-500 max-w-md mx-auto">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <p className="text-[12px] font-medium">Always bring recovery gear and communicate with your group.</p>
        </div>
      </div>

      {/* Run list */}
      <main className="max-w-md mx-auto px-4 pt-4 pb-28">
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
