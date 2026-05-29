import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl } from '@/utils/supabase/env';

import { authorizeCronRequest } from '@/lib/api/security';

export const runtime = 'nodejs';

const RUN_EXPIRY_MS = 24 * 60 * 60 * 1000;

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
  const nowIso = new Date(now).toISOString();
  const expiryIso = new Date(now - RUN_EXPIRY_MS).toISOString();

  const { data: started, error: startErr } = await admin
    .from('runs')
    .update({ status: 'active' })
    .eq('status', 'upcoming')
    .lte('date', nowIso)
    .gt('date', expiryIso)
    .select('id');

  if (startErr) {
    console.error('[cron/run-lifecycle] start', startErr);
    return NextResponse.json({ error: startErr.message }, { status: 500 });
  }

  const { data: completedActive, error: completeActiveErr } = await admin
    .from('runs')
    .update({ status: 'completed' })
    .eq('status', 'active')
    .lte('date', expiryIso)
    .select('id');

  if (completeActiveErr) {
    console.error('[cron/run-lifecycle] complete active', completeActiveErr);
    return NextResponse.json({ error: completeActiveErr.message }, { status: 500 });
  }

  const { data: completedStale, error: completeStaleErr } = await admin
    .from('runs')
    .update({ status: 'completed' })
    .eq('status', 'upcoming')
    .lte('date', expiryIso)
    .select('id');

  if (completeStaleErr) {
    console.error('[cron/run-lifecycle] complete stale upcoming', completeStaleErr);
    return NextResponse.json({ error: completeStaleErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    started: started?.length ?? 0,
    completedActive: completedActive?.length ?? 0,
    completedStaleUpcoming: completedStale?.length ?? 0,
  });
}
