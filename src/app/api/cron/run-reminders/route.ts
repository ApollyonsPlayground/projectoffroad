import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl } from '@/utils/supabase/env';

import { authorizeCronRequest } from '@/lib/api/security';
import { isPushSendEnabled } from '@/lib/push/pushConfig';
import { sendPushToUsers } from '@/lib/push/sendPush';
import { runReminderPushPayload } from '@/lib/push/runReminderPushCopy';

export const runtime = 'nodejs';

const BUCKETS = ['72h', '48h', '24h'] as const;

/** Hours until start must fall in these bands so each reminder fires once as time advances. */
function reminderBucketEligible(hoursUntil: number, bucket: (typeof BUCKETS)[number]): boolean {
  if (!Number.isFinite(hoursUntil) || hoursUntil <= 0 || hoursUntil > 72) return false;
  if (bucket === '72h') return hoursUntil <= 72 && hoursUntil > 48;
  if (bucket === '48h') return hoursUntil <= 48 && hoursUntil > 24;
  return hoursUntil <= 24;
}

export async function GET(request: NextRequest) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = Date.now();
  const { data: runs, error: runsErr } = await admin
    .from('runs')
    .select('id, title, date, host_id, status')
    .eq('status', 'upcoming')
    .gt('date', new Date(now).toISOString());

  if (runsErr) {
    console.error('[cron/run-reminders] runs', runsErr);
    return NextResponse.json({ error: runsErr.message }, { status: 500 });
  }

  let queued = 0;
  let pushesSent = 0;
  const rows = (runs ?? []) as { id: string; title: string; date: string; host_id: string | null }[];

  for (const run of rows) {
    const start = new Date(run.date).getTime();
    if (!Number.isFinite(start)) continue;
    const hoursUntil = (start - now) / 3600000;

    const { data: parts, error: pErr } = await admin
      .from('run_participants')
      .select('user_id')
      .eq('run_id', run.id)
      .eq('rsvp_status', 'going');
    if (pErr) {
      console.error('[cron/run-reminders] participants', run.id, pErr);
      continue;
    }

    const userIds = new Set<string>();
    if (run.host_id) userIds.add(run.host_id);
    for (const p of parts ?? []) {
      if (p?.user_id) userIds.add(String(p.user_id));
    }
    if (userIds.size === 0) continue;

    const { data: prefs, error: prefErr } = await admin
      .from('users')
      .select('id, notify_run_time_reminders')
      .in('id', [...userIds]);
    if (prefErr) {
      console.error('[cron/run-reminders] prefs', prefErr);
      continue;
    }

    const allow = new Map<string, boolean>();
    for (const u of prefs ?? []) {
      const id = (u as { id: string }).id;
      const on = (u as { notify_run_time_reminders?: boolean | null }).notify_run_time_reminders !== false;
      allow.set(id, on);
    }

    for (const userId of userIds) {
      if (!allow.get(userId)) continue;
      for (const bucket of BUCKETS) {
        if (!reminderBucketEligible(hoursUntil, bucket)) continue;
        const { error: insErr } = await admin.from('run_reminder_deliveries').insert({
          run_id: run.id,
          user_id: userId,
          bucket,
        });
        if (!insErr) {
          queued += 1;
          if (isPushSendEnabled()) {
            const payload = runReminderPushPayload(run.title, run.id, bucket);
            const result = await sendPushToUsers(admin, [userId], payload);
            if (result.sent && result.delivered > 0) pushesSent += result.delivered;
          }
        } else if (insErr.code !== '23505') {
          console.warn('[cron/run-reminders] insert', insErr);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, runs: rows.length, deliveriesQueued: queued, pushesSent });
}
