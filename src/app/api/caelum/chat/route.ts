import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/utils/supabase/env';

export const runtime = 'nodejs';

const MAX_LEN = 4000;
const RATE_PER_MIN = 10;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim().slice(0, 128);
  return 'unknown';
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.from('caelum_chat_queue').select('status, reply').eq('id', id).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const row = data as { status?: string; reply?: string | null };
  return NextResponse.json({
    status: row.status ?? 'unknown',
    reply: row.reply ?? null,
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const msgRaw = typeof body === 'object' && body && 'message' in body ? (body as { message: unknown }).message : null;
  const message = typeof msgRaw === 'string' ? msgRaw.trim() : '';

  if (!message || message.length > MAX_LEN) {
    return NextResponse.json(
      { success: false, error: `Message required (1–${MAX_LEN} chars)` },
      { status: 400 },
    );
  }

  const ctxRaw =
    typeof body === 'object' && body && 'context' in body ? (body as { context: unknown }).context : undefined;
  const ctxObj = ctxRaw && typeof ctxRaw === 'object' ? (ctxRaw as Record<string, unknown>) : {};

  const currentPage =
    typeof ctxObj.currentPage === 'string' ? ctxObj.currentPage.trim().slice(0, 512) : undefined;

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  let userId: string | undefined;
  let userName: string | undefined;

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (token && url && anonKey) {
    const anon = createClient(url, anonKey);
    const { data: userData } = await anon.auth.getUser(token);
    if (userData.user) {
      userId = userData.user.id;
      const meta = userData.user.user_metadata as Record<string, unknown> | undefined;
      const metaName =
        [meta?.full_name, meta?.name].find((v) => typeof v === 'string' && String(v).trim()) ?? null;
      userName = typeof metaName === 'string' ? metaName.trim() : undefined;

      if (!userName && serviceKey) {
        const admin = createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: row } = await admin.from('users').select('name').eq('id', userId).maybeSingle();
        const n = row && typeof (row as { name?: unknown }).name === 'string' ? (row as { name: string }).name : '';
        if (n.trim()) userName = n.trim();
      }
    }
  }

  const contextUserId = typeof ctxObj.userId === 'string' ? ctxObj.userId.trim() : undefined;
  const contextUserName = typeof ctxObj.userName === 'string' ? ctxObj.userName.trim() : undefined;

  const resolvedUserId = userId ?? contextUserId;
  const resolvedUserName = userName ?? contextUserName;

  const bucketKey = resolvedUserId ? `uid:${resolvedUserId}` : `ip:${clientIp(request)}`;

  if (!serviceKey || !url) {
    return NextResponse.json({ success: false, error: 'Server misconfigured (Supabase service role)' }, { status: 500 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rateData, error: rateErr } = await admin.rpc('caelum_chat_rate_touch', {
    p_bucket: bucketKey,
    p_max: RATE_PER_MIN,
  });

  if (rateErr) {
    return NextResponse.json(
      { success: false, error: `Rate limit unavailable (${rateErr.message}). Run latest migrations.` },
      { status: 503 },
    );
  }

  const allowed =
    rateData &&
    typeof rateData === 'object' &&
    'allowed' in rateData &&
    (rateData as { allowed?: unknown }).allowed === true;

  if (!allowed) {
    return NextResponse.json(
      { success: false, error: `Easy there — max ${RATE_PER_MIN} messages per minute.` },
      { status: 429 },
    );
  }

  const { data: inserted, error: insErr } = await admin
    .from('caelum_chat_queue')
    .insert({
      user_id: resolvedUserId ?? null,
      user_name: resolvedUserName ?? null,
      message,
      status: 'pending',
      current_page: currentPage ?? null,
    })
    .select('id')
    .single();

  if (insErr || !inserted?.id) {
    return NextResponse.json(
      { success: false, error: insErr?.message ?? 'Could not enqueue message' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    id: String((inserted as { id: string }).id),
  });
}