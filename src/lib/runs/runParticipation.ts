/** Primary CTA label for joining or leaving a run. */
export function runJoinActionLabel(status: string, joined: boolean): string {
  if (joined) return 'Joined';
  if (String(status).toLowerCase() === 'active') return 'Join live run';
  return 'Join Run';
}
