import { isCapacitorNative } from '@/utils/capacitator/isNative';

const BUCKETS = ['72h', '48h', '24h'] as const;
const HOURS: Record<(typeof BUCKETS)[number], number> = {
  '72h': 72,
  '48h': 48,
  '24h': 24,
};

/** Deterministic 31-bit positive id for LocalNotifications (Capacitor requires integer id). */
export function runReminderNotificationId(runId: string, bucket: (typeof BUCKETS)[number]): number {
  const s = `${runId}:${bucket}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 2147480000;
}

/**
 * Native only: schedule local notifications at ~72h / 48h / 24h before run start.
 * Skips times in the past. Caller should cancel on leave run / reschedule after date change.
 */
export async function scheduleRunTimeLocalReminders(opts: {
  runId: string;
  title: string;
  runDateIso: string;
}): Promise<void> {
  if (!isCapacitorNative()) return;
  const start = new Date(opts.runDateIso).getTime();
  if (!Number.isFinite(start)) return;
  const now = Date.now();
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') return;

  const notifications: {
    id: number;
    title: string;
    body: string;
    schedule: { at: Date };
  }[] = [];

  for (const bucket of BUCKETS) {
    const at = start - HOURS[bucket] * 60 * 60 * 1000;
    if (at <= now) continue;
    const id = runReminderNotificationId(opts.runId, bucket);
    const label =
      bucket === '72h' ? 'in 3 days' : bucket === '48h' ? 'in 2 days' : 'tomorrow';
    notifications.push({
      id,
      title: 'Run reminder',
      body: `"${opts.title.slice(0, 80)}" starts ${label}.`,
      schedule: { at: new Date(at) },
    });
  }

  if (notifications.length === 0) return;
  await LocalNotifications.schedule({ notifications });
}

/** Cancel all scheduled run reminders for this run (native only). */
export async function cancelRunTimeLocalReminders(runId: string): Promise<void> {
  if (!isCapacitorNative()) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const notifications = BUCKETS.map((bucket) => ({ id: runReminderNotificationId(runId, bucket) }));
  await LocalNotifications.cancel({ notifications });
}
