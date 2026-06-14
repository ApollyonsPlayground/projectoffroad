export function runReminderBucketLabel(bucket: '72h' | '48h' | '24h'): string {
  if (bucket === '72h') return '3 days';
  if (bucket === '48h') return '2 days';
  return '24 hours';
}

export function runReminderPushPayload(
  runTitle: string,
  runId: string,
  bucket: '72h' | '48h' | '24h'
): { title: string; body: string; data: Record<string, string> } {
  const when = runReminderBucketLabel(bucket);
  return {
    title: 'Run reminder',
    body: `"${runTitle}" starts in ${when}.`,
    data: {
      type: 'run_reminder',
      runId,
      bucket,
    },
  };
}
