import { parseMissingColumnMessage } from '@/lib/supabase/insertAdaptive';

export type RunPublishContext = {
  mode: 'club_official' | 'user_submitted';
  staffFromDb: boolean;
};

export type RunPublishErrorDisplay = {
  headline: string;
  detail: string;
  /** Raw server message for console / support */
  technical: string;
};

type SupabaseLikeError = {
  message: string;
  code: string;
  details: string;
  hint: string;
};

function asSupabaseError(err: unknown): SupabaseLikeError {
  if (!err || typeof err !== 'object') {
    return {
      message: err == null ? '' : String(err),
      code: '',
      details: '',
      hint: '',
    };
  }
  const e = err as Partial<SupabaseLikeError>;
  return {
    message: e.message ?? '',
    code: e.code ?? '',
    details: e.details ?? '',
    hint: e.hint ?? '',
  };
}

function constraintLabel(raw: string): string | null {
  const msg = raw.toLowerCase();
  if (msg.includes('runs_difficulty_check') || msg.includes('difficulty')) {
    return 'Difficulty value is not allowed by the database.';
  }
  if (msg.includes('runs_run_source_check') || msg.includes('run_source')) {
    return 'Run type (official vs community) is not valid — the database may need a migration.';
  }
  if (msg.includes('runs_visibility_check') || msg.includes('visibility')) {
    return 'Visibility setting is not valid.';
  }
  if (msg.includes('runs_status_check') || msg.includes('status')) {
    return 'Run status is not valid.';
  }
  if (msg.includes('club_id') && msg.includes('foreign key')) {
    return 'The selected club no longer exists or cannot be linked.';
  }
  if (msg.includes('trail_id') && msg.includes('foreign key')) {
    return 'The selected trail is no longer available — try another trail or leave it blank.';
  }
  if (msg.includes('host_id') && msg.includes('foreign key')) {
    return 'Your account could not be set as host — try signing out and back in.';
  }
  return null;
}

/**
 * Turn Supabase/Postgres errors from runs insert into user-facing copy.
 */
export function formatRunPublishError(
  err: unknown,
  context: RunPublishContext
): RunPublishErrorDisplay {
  const { message, code, details, hint } = asSupabaseError(err);
  const combined = [message, details, hint].filter(Boolean).join(' — ');
  const lower = combined.toLowerCase();

  const technical = [code && `code ${code}`, combined].filter(Boolean).join(' · ') || 'Unknown error';

  if (
    code === 'PGRST116' ||
    lower.includes('0 rows') ||
    lower.includes('cannot coerce the result to a single json object')
  ) {
    return {
      headline: 'Run may have been created but could not be confirmed',
      detail:
        'The server saved the run but your account could not read it back (visibility or permissions). Check Runs — if it appears, you are done. Otherwise try again or contact support.',
      technical,
    };
  }

  if (
    code === '42501' ||
    lower.includes('row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('violates row-level security')
  ) {
    if (context.mode === 'club_official' && context.staffFromDb) {
      return {
        headline: 'Staff official run blocked by permissions',
        detail:
          'Platform staff should be able to publish official runs without a club. If this persists, the database policy may be out of date — run npm run db:push on the project, then try again.',
        technical,
      };
    }
    if (context.mode === 'club_official') {
      return {
        headline: 'Official club run not allowed',
        detail:
          'Official runs require you to be an approved owner, admin, or officer of the verified club you selected. Pick a different club or post as a community run instead.',
        technical,
      };
    }
    return {
      headline: 'Permission denied',
      detail: 'Your account is not allowed to publish this run. Sign in again or try a community run.',
      technical,
    };
  }

  const missingCol = parseMissingColumnMessage(message);
  if (missingCol || code === 'PGRST204' || lower.includes('could not find')) {
    return {
      headline: 'Database schema out of date',
      detail: `Missing column or field (${missingCol ?? 'unknown'}). Deploy the latest app and run npm run db:push, then try again.`,
      technical,
    };
  }

  if (code === '23514' || lower.includes('check constraint')) {
    const label = constraintLabel(combined);
    return {
      headline: 'Invalid run data',
      detail: label ?? 'One of the values did not pass server validation. Review difficulty, date, and club, then try again.',
      technical,
    };
  }

  if (code === '23503' || lower.includes('foreign key')) {
    const label = constraintLabel(combined);
    return {
      headline: 'Linked record not found',
      detail: label ?? 'A club or trail you selected is no longer valid. Refresh the page and pick again.',
      technical,
    };
  }

  if (code === '23505' || lower.includes('duplicate key')) {
    return {
      headline: 'Duplicate run',
      detail: 'A run with these details may already exist. Check your runs list before publishing again.',
      technical,
    };
  }

  if (code === '22007' || lower.includes('invalid input syntax for type timestamp')) {
    return {
      headline: 'Invalid date or time',
      detail: 'The run date could not be saved. Pick the date and time again.',
      technical,
    };
  }

  if (code === '22P02' || lower.includes('invalid input syntax for type uuid')) {
    return {
      headline: 'Invalid selection',
      detail: 'A club or trail ID was rejected. Refresh the page and re-select from the dropdowns.',
      technical,
    };
  }

  if (lower.includes('jwt') || lower.includes('not authenticated') || code === '401') {
    return {
      headline: 'Session expired',
      detail: 'Sign out and sign back in, then try publishing again.',
      technical,
    };
  }

  if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('load failed')) {
    return {
      headline: 'Connection problem',
      detail: 'Could not reach the server. Check your internet and try again.',
      technical,
    };
  }

  if (
    lower.includes('user_acknowledged') ||
    lower.includes('meetup_latitude') ||
    lower.includes('meetup_longitude') ||
    lower.includes('comms_note')
  ) {
    return {
      headline: 'Database needs an update',
      detail: 'Run publishing requires newer database columns. Run npm run db:push, then try again.',
      technical,
    };
  }

  if (message.trim()) {
    return {
      headline: 'Could not publish run',
      detail: message.trim(),
      technical,
    };
  }

  return {
    headline: 'Could not publish run',
    detail: 'Something went wrong while saving. Try again — if it keeps failing, note the time and contact support.',
    technical,
  };
}
