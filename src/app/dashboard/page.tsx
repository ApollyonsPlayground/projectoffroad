'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';
import { Loader2 } from 'lucide-react';

interface RunRow {
  id: string;
  title: string;
  date: string;
  difficulty: string | null;
  club?: { name: string | null } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading, supabaseClient } = useAuth();
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [stats, setStats] = useState({
    runsJoined: 0,
    trailsReviewed: 0,
    following: 0,
  });
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login/?next=/dashboard/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !supabaseClient) {
      if (!loading) setFetching(false);
      return;
    }

    let cancelled = false;

    async function load() {
      if (!user || !supabaseClient) return;
      setFetching(true);
      const uid = user.id;

      const [upcomingRes, rpRes, reviewsRes, followsRes] = await Promise.all([
        supabaseClient
          .from('runs')
          .select('id, title, date, difficulty, club:clubs(name)')
          .eq('status', 'upcoming')
          .order('date', { ascending: true })
          .limit(5),
        supabaseClient
          .from('run_participants')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', uid)
          .eq('rsvp_status', 'going'),
        supabaseClient.from('reviews').select('trail_id').eq('user_id', uid),
        supabaseClient
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', uid),
      ]);

      if (cancelled) return;

      if (!upcomingRes.error && upcomingRes.data) {
        setRuns(upcomingRes.data as unknown as RunRow[]);
      }

      const runsJoined = rpRes.count ?? 0;
      const trailIds = (reviewsRes.error ? [] : reviewsRes.data ?? [])
        .map((r) => r.trail_id)
        .filter(Boolean);
      const trailsReviewed = new Set(trailIds).size;
      const following = followsRes.count ?? 0;

      setStats({ runsJoined, trailsReviewed, following });
      setFetching(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, supabaseClient, loading]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Welcome back, {(profile?.name as string | undefined) || 'Rider'}!
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Your trail stats and what&apos;s coming up.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-3xl font-bold text-primary tabular-nums">{stats.runsJoined}</div>
            <div className="text-muted-foreground text-sm mt-1">Run RSVPs (going)</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-3xl font-bold text-primary tabular-nums">{stats.trailsReviewed}</div>
            <div className="text-muted-foreground text-sm mt-1">Trails reviewed</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-3xl font-bold text-primary tabular-nums">{stats.following}</div>
            <div className="text-muted-foreground text-sm mt-1">Following</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Upcoming runs</h2>
          </div>
          <div className="p-5">
            {runs.length > 0 ? (
              <ul className="space-y-3">
                {runs.map((run) => (
                  <li
                    key={run.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg bg-secondary/50 border border-border"
                  >
                    <div>
                      <div className="font-medium text-foreground">{run.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(run.date).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}{' '}
                        · {(run.club as { name?: string } | null)?.name ?? 'Independent'} ·{' '}
                        {run.difficulty ?? '—'}
                      </div>
                    </div>
                    <Link
                      href={`/runs/${run.id}/`}
                      className="inline-flex justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
                    >
                      View / RSVP
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">
                No upcoming runs in the calendar yet. Check{' '}
                <Link href="/runs/" className="text-primary font-semibold hover:underline">
                  Runs
                </Link>{' '}
                or{' '}
                <Link href="/clubs/" className="text-primary font-semibold hover:underline">
                  Clubs
                </Link>
                .
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/clubs/"
            className="block p-5 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
          >
            <div className="font-semibold text-foreground mb-1">Find a club</div>
            <div className="text-sm text-muted-foreground">Join locals running your kind of trails.</div>
          </Link>
          <Link
            href="/profile/"
            className="block p-5 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
          >
            <div className="font-semibold text-foreground mb-1">Rig portfolio</div>
            <div className="text-sm text-muted-foreground">Vehicles, bio, and trail history.</div>
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
