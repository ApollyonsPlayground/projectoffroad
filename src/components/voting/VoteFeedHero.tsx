'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, Loader2, Trophy, MapPin } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { VotingDashboard } from '@/components/voting/VotingDashboard';
import {
  fetchFeaturedVotingEvent,
  fetchVotingResults,
  formatCountdown,
  resolveVotingPhase,
  type VotingEvent,
  type VotingPhase,
  type VotingResultRow,
} from '@/lib/voting/fetchVotingEvent';

function VoteComingSoon({ event }: { event: VotingEvent }) {
  const startsMs = new Date(event.starts_at).getTime();
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const tick = () => {
      const remaining = startsMs - Date.now();
      setCountdown(remaining > 0 ? formatCountdown(remaining) : 'Opening soon');
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startsMs]);

  return (
    <div className="mx-4 mt-4 rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
      <div className="p-5 sm:p-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">
          Huge community event
        </p>
        <h2 className="text-xl font-black text-foreground">Vote opens soon</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-lg">
          {event.description ||
            'Help pick the trail for our next group run. Four options — Lytle Creek and Cleghorn, day and night. Voting opens soon on the feed.'}
        </p>
        <div className="flex items-center gap-2 mt-4 text-sm font-semibold text-foreground">
          <Clock size={16} className="text-primary shrink-0" />
          <span>
            Voting opens in{' '}
            <span className="text-primary font-black tabular-nums">{countdown}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {['Lytle Creek', 'Lytle Creek (Night)', 'Cleghorn', 'Cleghorn (Night)'].map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted border border-border text-[11px] font-semibold text-muted-foreground"
            >
              <MapPin size={10} className="text-primary/80" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function VoteResults({ event, results }: { event: VotingEvent; results: VotingResultRow[] }) {
  const winners = results.filter((r) => r.is_winner);
  const totalVotes = results.reduce((sum, r) => sum + r.vote_count, 0);

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
          Vote complete
        </p>
        <h2 className="text-lg font-black text-foreground">{event.title}</h2>
        {winners.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <Trophy size={20} className="text-amber-400 shrink-0" />
            <p className="text-base font-bold text-foreground">
              Winner{winners.length > 1 ? 's' : ''}:{' '}
              <span className="text-primary">{winners.map((w) => w.title).join(' · ')}</span>
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{totalVotes} total vote{totalVotes === 1 ? '' : 's'}</p>
      </div>
      <ul className="divide-y divide-border">
        {results.map((row) => (
          <li
            key={row.option_id}
            className={`flex items-center justify-between gap-3 px-5 py-3 ${
              row.is_winner ? 'bg-primary/5' : ''
            }`}
          >
            <span className={`text-sm font-semibold ${row.is_winner ? 'text-primary' : 'text-foreground'}`}>
              {row.title}
              {row.is_winner ? ' ★' : ''}
            </span>
            <span className="text-sm font-black tabular-nums text-muted-foreground">{row.vote_count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VoteFeedHero() {
  const { user, supabaseClient } = useAuth();
  const [event, setEvent] = useState<VotingEvent | null>(null);
  const [phase, setPhase] = useState<VotingPhase>('none');
  const [results, setResults] = useState<VotingResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabaseClient) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const ev = await fetchFeaturedVotingEvent(supabaseClient);
      setEvent(ev);
      if (!ev) {
        setPhase('none');
        return;
      }
      const p = resolveVotingPhase(ev);
      setPhase(p);
      if (p === 'results') {
        const rows = await fetchVotingResults(supabaseClient, ev.id);
        setResults(rows);
      } else {
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, [supabaseClient]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!event) return;
    const id = window.setInterval(() => {
      setPhase(resolveVotingPhase(event));
    }, 1000);
    return () => window.clearInterval(id);
  }, [event]);

  useEffect(() => {
    if (!supabaseClient || !event || phase !== 'results') return;
    void fetchVotingResults(supabaseClient, event.id).then(setResults);
  }, [supabaseClient, event, phase]);

  if (loading) {
    return (
      <div className="mx-4 mt-4 flex justify-center py-8">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!event || phase === 'none') return null;

  if (phase === 'coming_soon') {
    return <VoteComingSoon event={event} />;
  }

  if (phase === 'live') {
    return (
      <div className="mx-4 mt-4">
        <VotingDashboard event={event} supabaseClient={supabaseClient!} userId={user?.id ?? null} />
      </div>
    );
  }

  return <VoteResults event={event} results={results} />;
}
