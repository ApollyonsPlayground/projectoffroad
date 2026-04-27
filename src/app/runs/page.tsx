'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  ChevronRight,
  Plus,
  AlertTriangle,
  Filter,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { RunListSkeleton } from '@/components/SkeletonLoader';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { useAuth } from '@/context/AuthContext';

interface Run {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  difficulty: string;
  max_participants: number;
  current_participants: number;
  meetup_location: string;
  trail_name?: string;
  status: 'upcoming' | 'active' | 'completed';
  organizer_name?: string;
  club_name?: string;
}

// Placeholder runs for demo
const placeholderRuns: Run[] = [
  {
    id: '1',
    title: 'Holcomb Valley Weekend Run',
    description: 'All skill levels welcome. We will tackle John Bull and Gold Mountain. Recovery gear required.',
    date: '2026-05-03',
    time: '07:00',
    difficulty: 'Advanced',
    max_participants: 12,
    current_participants: 8,
    meetup_location: 'Big Bear Discovery Center',
    trail_name: 'Holcomb Valley',
    status: 'upcoming',
    organizer_name: 'Mike D.',
    club_name: 'SoCal Crawlers',
  },
  {
    id: '2',
    title: 'Beginner Friendly Trail Day',
    description: 'Perfect for new wheelers. Cleghorn fire road run with basic instruction and spotting.',
    date: '2026-04-28',
    time: '08:30',
    difficulty: 'Beginner',
    max_participants: 20,
    current_participants: 15,
    meetup_location: 'Cajon Pass Rest Area',
    trail_name: 'Cleghorn Ridge',
    status: 'upcoming',
    organizer_name: 'Sarah M.',
  },
  {
    id: '3',
    title: 'Johnson Valley Night Run',
    description: 'Light bars required. Desert run under the stars. Camping optional after.',
    date: '2026-05-10',
    time: '18:00',
    difficulty: 'Moderate',
    max_participants: 15,
    current_participants: 6,
    meetup_location: 'Landers General Store',
    trail_name: 'Jack North Trail',
    status: 'upcoming',
    organizer_name: 'Dan T.',
    club_name: 'Desert Runners OC',
  },
  {
    id: '4',
    title: 'Extreme Rock Crawl Challenge',
    description: 'Dishpan Springs full send. Winch required. Body damage likely. Experienced only.',
    date: '2026-05-17',
    time: '06:00',
    difficulty: 'Extreme',
    max_participants: 8,
    current_participants: 4,
    meetup_location: 'Big Bear Village',
    trail_name: 'Dishpan Springs',
    status: 'upcoming',
    organizer_name: 'Jake R.',
    club_name: 'Big Bear Wheelers',
  },
];

function getDifficultyColor(difficulty: string): string {
  const level = difficulty.toLowerCase();
  if (level === 'beginner' || level === 'easy') return 'badge-beginner';
  if (level === 'moderate' || level === 'intermediate') return 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30';
  if (level === 'advanced' || level === 'challenging') return 'badge-advanced';
  if (level === 'extreme') return 'badge-extreme';
  return 'bg-zinc-700/50 text-zinc-400';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function RunCard({ run, index }: { run: Run; index: number }) {
  const spotsLeft = run.max_participants - run.current_participants;
  const isFull = spotsLeft <= 0;
  const isAlmostFull = spotsLeft <= 3 && spotsLeft > 0;

  return (
    <motion.article
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-zinc-900 border border-zinc-800 overflow-hidden hover:border-orange-500/50 transition-colors"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate mb-1">{run.title}</h3>
            {run.club_name && (
              <p className="text-xs text-orange-500">{run.club_name}</p>
            )}
          </div>
          <span className={`px-2 py-1 text-xs font-bold uppercase ${getDifficultyColor(run.difficulty)}`}>
            {run.difficulty}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-400 line-clamp-2 mb-4">
          {run.description}
        </p>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Calendar size={14} className="text-orange-500" />
            <span>{formatDate(run.date)} at {run.time}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <MapPin size={14} className="text-orange-500" />
            <span className="truncate">{run.meetup_location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users size={14} className="text-orange-500" />
            <span className={isAlmostFull ? 'text-orange-400' : isFull ? 'text-red-400' : 'text-zinc-500'}>
              {run.current_participants}/{run.max_participants} joined
              {isAlmostFull && ' - Almost full!'}
              {isFull && ' - Full'}
            </span>
          </div>
        </div>

        {/* Organizer */}
        {run.organizer_name && (
          <p className="text-xs text-zinc-600 mb-4">
            Organized by {run.organizer_name}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/runs/${run.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
          >
            View Details
            <ChevronRight size={16} />
          </Link>
          <Link
            href={`/runs/${run.id}?join=true`}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors ${
              isFull
                ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-zinc-950'
            }`}
          >
            <Zap size={16} />
            {isFull ? 'Full' : 'Join Run'}
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

type FilterType = 'all' | 'upcoming' | 'active' | 'completed';

export default function RunsPage() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('upcoming');

  useEffect(() => {
    async function fetchRuns() {
      if (!supabase || !isSupabaseConfigured()) {
        setRuns(placeholderRuns);
        setIsLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('runs')
          .select('*, club:clubs(name)')
          .order('date', { ascending: true });

        if (filter !== 'all') {
          query = query.eq('status', filter);
        }

        const { data, error } = await query;

        if (error) throw error;
        setRuns(data?.length ? data : placeholderRuns);
      } catch (err) {
        console.error('Error fetching runs:', err);
        setRuns(placeholderRuns);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRuns();
  }, [filter]);

  const filteredRuns = useMemo(() => {
    if (filter === 'all') return runs;
    return runs.filter((run) => run.status === filter);
  }, [runs, filter]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-zinc-800 safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-white">Runs</h1>
            {user && (
              <Link
                href="/runs/create"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 text-sm font-semibold transition-colors"
              >
                <Plus size={16} />
                Create Run
              </Link>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {(['upcoming', 'active', 'completed'] as FilterType[]).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                  filter === filterOption
                    ? 'bg-orange-500 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {filterOption}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Safety Notice */}
      <div className="px-4 py-3 bg-orange-500/10 border-b border-orange-500/20">
        <div className="flex items-center gap-2 text-orange-500">
          <AlertTriangle size={16} />
          <p className="text-xs font-medium">
            Always bring recovery gear and communicate with your group.
          </p>
        </div>
      </div>

      {/* Run List */}
      <main className="max-w-lg mx-auto px-4 py-4 pb-safe-nav">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RunListSkeleton count={3} />
            </motion.div>
          ) : filteredRuns.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Calendar size={48} className="mx-auto text-zinc-700 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-400 mb-2">
                No {filter} runs
              </h3>
              <p className="text-sm text-zinc-600 mb-6">
                Be the first to organize a run
              </p>
              {user && (
                <Link
                  href="/runs/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 text-sm font-semibold transition-colors"
                >
                  <Plus size={16} />
                  Create Run
                </Link>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="runs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <p className="text-sm text-zinc-500">
                {filteredRuns.length} {filter} run{filteredRuns.length !== 1 ? 's' : ''}
              </p>
              {filteredRuns.map((run, index) => (
                <RunCard key={run.id} run={run} index={index} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
