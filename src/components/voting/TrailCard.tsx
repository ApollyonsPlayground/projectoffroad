'use client';

import { Moon, Mountain } from 'lucide-react';
import type { TrailOption } from '@/lib/voting/fetchVotingEvent';

function difficultyClass(difficulty: string): string {
  const d = difficulty.toLowerCase();
  if (d === 'beginner' || d === 'easy') return 'badge-beginner';
  if (d === 'moderate') return 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30';
  return 'badge-extreme';
}

type Props = {
  option: TrailOption;
  onVote?: (optionId: string) => void;
  disabled?: boolean;
  showVoteButton?: boolean;
  isLockedChoice?: boolean;
  submitting?: boolean;
};

export function TrailCard({
  option,
  onVote,
  disabled = false,
  showVoteButton = true,
  isLockedChoice = false,
  submitting = false,
}: Props) {
  const canVote = showVoteButton && !disabled && onVote && !isLockedChoice;

  return (
    <article
      className={`card-industrial overflow-hidden border bg-card transition-colors ${
        isLockedChoice
          ? 'border-primary ring-2 ring-primary/40'
          : 'border-border hover:border-primary/40'
      }`}
    >
      <div className="relative h-36 bg-muted">
        {option.image_url ? (
          <img
            src={option.image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
            <Mountain size={32} className="text-muted-foreground" />
          </div>
        )}
        <div
          className={`absolute inset-0 bg-gradient-to-t to-background/90 ${
            option.is_night_run ? 'from-zinc-950/90 via-zinc-950/50' : 'from-zinc-950/70 via-transparent'
          }`}
        />
        <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-2">
          <span
            className={`inline-flex px-2 py-1 text-[10px] font-black uppercase tracking-wider border rounded ${difficultyClass(option.difficulty)}`}
          >
            {option.difficulty}
          </span>
          {option.is_night_run && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded">
              <Moon size={10} />
              Night run
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <h3 className="text-base font-black text-foreground leading-tight">{option.title}</h3>
        <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-4">
          {option.description}
        </p>

        {canVote && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => onVote(option.id)}
            className="w-full min-h-[44px] py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-black uppercase tracking-wide transition disabled:opacity-50"
          >
            {submitting ? 'Recording…' : 'Cast vote'}
          </button>
        )}

        {isLockedChoice && (
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary text-center">
            Your pick
          </p>
        )}
      </div>
    </article>
  );
}
