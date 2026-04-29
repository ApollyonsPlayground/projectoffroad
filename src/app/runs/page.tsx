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
  date: string;                  // timestamp string from DB
  meetup_location: string;
  difficulty: string;
  max_participants: number | null;
  vehicle_requirements?: string | null;
  status: string;
  club_id?: string | null;
  club?: { name: string } | null;
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
              <Link
                href="/runs/create"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-black text-[13px] font-bold rounded-lg transition-colors"
              >
                <Plus size={15} />
                Create Run
              </Link>
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
                <Link
                  href="/runs/create"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-black text-[13px] font-bold rounded-xl transition-colors"
                >
                  <Plus size={15} />
                  Create Run
                </Link>
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
    </div>
  );
}
