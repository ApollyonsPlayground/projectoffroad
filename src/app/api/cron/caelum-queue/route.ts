import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processCaelumQueueBatch } from '@/lib/caelum/processQueue';
import { getSupabaseUrl } from '@/utils/supabase/env';

export const runtime = 'nodejs';

/** Hobby/starter may cap lower; batch is small. */
export const maxDuration = 60;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization');

  if (process.env.NODE_ENV === 'production') {
    if (!secret) return false;
    return auth === `Bearer ${secret}`;
  }

  if (secret) {
    return auth === `Bearer ${secret}`;
  }

  return true;
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  if (!authorizeCron(request)) {
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

  try {
    const { processed } = await processCaelumQueueBatch(admin, 20);
    return NextResponse.json({ ok: true, processed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Processor failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
