'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Clock, Lock, Loader2 } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useToast } from '@/components/Toast';
import { TrailCard } from '@/components/voting/TrailCard';
import {
  castVote,
  fetchTrailOptions,
  fetchUserVote,
  formatCountdown,
  type TrailOption,
  type UserVote,
  type VotingEvent,
} from '@/lib/voting/fetchVotingEvent';

type Props = {
  event: VotingEvent;
  supabaseClient: SupabaseClient;
  userId: string | null;
};

export function VotingDashboard({ event, supabaseClient, userId }: Props) {
  const { showToast } = useToast();
  const [options, setOptions] = useState<TrailOption[]>([]);
  const [userVote, setUserVote] = useState<UserVote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');

  const endsMs = new Date(event.ends_at).getTime();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const opts = await fetchTrailOptions(supabaseClient, event.id);
      setOptions(opts);
      if (userId) {
        const vote = await fetchUserVote(supabaseClient, event.id, userId);
        setUserVote(vote);
      } else {
        setUserVote(null);
      }
    } finally {
      setLoading(false);
    }
  }, [supabaseClient, event.id, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const tick = () => {
      const remaining = endsMs - Date.now();
      setCountdown(remaining > 0 ? formatCountdown(remaining) : 'Voting closed');
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsMs]);

  const hasVoted = !!userVote;
  const lockedChoiceId = userVote?.trail_option_id ?? null;

  async function handleVote(optionId: string) {
    if (!userId) return;
    if (hasVoted || submittingId) return;
    setSubmittingId(optionId);
    const result = await castVote(supabaseClient, event.id, optionId, userId);
    setSubmittingId(null);
    if (!result.ok) {
      showToast(result.message, 'error');
      return;
    }
    setUserVote({
      id: '',
      voting_event_id: event.id,
      trail_option_id: optionId,
      user_id: userId,
    });
    showToast('Vote locked — winner revealed when the timer ends.', 'success');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card/80 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
          Community trail vote
        </p>
        <h2 className="text-lg font-black text-foreground">{event.title}</h2>
        {event.description ? (
          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
        ) : null}
        <div className="flex items-center gap-2 mt-3 text-sm font-semibold text-foreground">
          <Clock size={16} className="text-primary shrink-0" />
          <span>
            Time left: <span className="text-primary font-black tabular-nums">{countdown}</span>
          </span>
        </div>
      </div>

      {hasVoted && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
          <Lock size={18} className="text-primary shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-foreground">
            Vote locked. Winner revealed when the timer ends.
          </p>
        </div>
      )}

      {!userId && (
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">Sign in to cast your blind vote.</p>
          <Link
            href="/login/?next=/feed/"
            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg bg-primary text-primary-foreground text-sm font-bold shrink-0"
          >
            Sign in to vote
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((option) => (
          <TrailCard
            key={option.id}
            option={option}
            onVote={userId ? handleVote : undefined}
            disabled={hasVoted || !userId}
            showVoteButton={!hasVoted}
            isLockedChoice={lockedChoiceId === option.id}
            submitting={submittingId === option.id}
          />
        ))}
      </div>
    </div>
  );
}
