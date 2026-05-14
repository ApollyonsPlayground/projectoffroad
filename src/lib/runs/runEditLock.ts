const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * When true, host/staff should not change run details (title, meetup, flyer, etc.).
 * Status-only updates (activate, complete, cancel) are handled separately in DB.
 *
 * Completed / cancelled runs are never locked by this rule so post-event fixes stay possible.
 */
export function isRunDetailsEditLocked(run: { date: string; status: string }): boolean {
  const s = String(run.status || '').toLowerCase();
  if (s === 'completed' || s === 'cancelled') return false;
  const start = new Date(run.date).getTime();
  if (!Number.isFinite(start)) return false;
  const msUntilStart = start - Date.now();
  return msUntilStart <= TWENTY_FOUR_HOURS_MS;
}
