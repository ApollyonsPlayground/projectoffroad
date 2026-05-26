import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { parseMissingColumnMessage } from '@/lib/supabase/insertAdaptive';
import { resolvePublicDisplayName } from '@/lib/profileDisplay';
import {
  TRAIL_REPORT_CONDITION_OPTIONS,
  TRAIL_REPORT_DIFFICULTY_OPTIONS,
  buildTrailReportFeedBody,
  normalizeTrailReportPhotoUrls,
  normalizeTrailReportTags,
} from '@/lib/trails/trailReports';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/utils/supabase/env';

export const runtime = 'nodejs';

const conditionIds = new Set(TRAIL_REPORT_CONDITION_OPTIONS.map((option) => option.id));
const difficultyIds = new Set(TRAIL_REPORT_DIFFICULTY_OPTIONS.map((option) => option.id));

type InsertResult = {
  data: { id: string } | null;
  error: { message: string; code?: string } | null;
};

async function insertReturningIdAdaptive(
  client: SupabaseClient,
  table: string,
  initialRow: Record<string, unknown>
): Promise<InsertResult> {
  let row = { ...initialRow };
  let lastMsg = '';

  for (let i = 0; i < 32; i++) {
    const { data, error } = await client
      .from(table)
      .insert(row)
      .select('id')
      .single();

    if (!error && data?.id) return { data: { id: String(data.id) }, error: null };

    lastMsg = error?.message ?? '';
    const badCol = parseMissingColumnMessage(lastMsg);
    if (badCol && Object.prototype.hasOwnProperty.call(row, badCol)) {
      const next = { ...row };
      delete next[badCol];
      row = next;
      continue;
    }

    return { data: null, error: { message: lastMsg || 'Insert failed', code: error?.code } };
  }

  return { data: null, error: { message: lastMsg || 'Too many insert retries' } };
}

function bearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization')?.trim() ?? '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
}

function validOption(value: unknown, allowed: Set<string>, fallback: string): string {
  const normalized = String(value ?? fallback).trim().toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function isOwnPostImageUrl(imageUrl: string, supabaseUrl: string, userId: string): boolean {
  try {
    const url = new URL(imageUrl);
    const base = new URL(supabaseUrl);
    if (url.host !== base.host) return false;
    const expected = `/storage/v1/object/public/post-images/${userId}/`;
    return decodeURIComponent(url.pathname).startsWith(expected);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const token = bearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authErr } = await anon.auth.getUser(token);
  if (authErr || !authData.user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const user = authData.user;
  const trailId = String(raw.trail_id ?? '').trim();
  const runId = String(raw.run_id ?? '').trim() || null;
  const body = String(raw.body ?? '').trim();
  const conditionStatus = validOption(raw.condition_status, conditionIds, 'unknown');
  const difficultyToday = validOption(raw.difficulty_today, difficultyIds, 'unknown');
  const surfaceConditions = normalizeTrailReportTags(raw.surface_conditions);
  const hazards = normalizeTrailReportTags(raw.hazards);
  const hazardsNote = String(raw.hazards_note ?? '').trim() || null;
  const weather = String(raw.weather ?? '').trim() || null;
  const photoUrls = normalizeTrailReportPhotoUrls(raw.photo_urls);

  if (!trailId) {
    return NextResponse.json({ error: 'Missing trail_id' }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json({ error: 'Write a short trail report' }, { status: 400 });
  }
  if (body.length > 4000) {
    return NextResponse.json({ error: 'Trail report must be under 4000 characters' }, { status: 400 });
  }
  if (photoUrls.some((url) => !isOwnPostImageUrl(url, supabaseUrl, user.id))) {
    return NextResponse.json({ error: 'Invalid report photo URL' }, { status: 400 });
  }

  const { data: trail, error: trailErr } = await admin
    .from('trails')
    .select('id, name, title')
    .eq('id', trailId)
    .maybeSingle();

  if (trailErr) {
    return NextResponse.json({ error: trailErr.message }, { status: 500 });
  }
  if (!trail) {
    return NextResponse.json({ error: 'Trail not found' }, { status: 404 });
  }

  if (runId) {
    const { data: run, error: runErr } = await admin
      .from('runs')
      .select('id, status, trail_id, host_id')
      .eq('id', runId)
      .maybeSingle();
    if (runErr) return NextResponse.json({ error: runErr.message }, { status: 500 });
    if (!run || run.status !== 'completed' || String(run.trail_id ?? '') !== trailId) {
      return NextResponse.json({ error: 'This report is not valid for that run' }, { status: 403 });
    }
    if (run.host_id !== user.id) {
      const { data: participant, error: partErr } = await admin
        .from('run_participants')
        .select('id')
        .eq('run_id', runId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (partErr) return NextResponse.json({ error: partErr.message }, { status: 500 });
      if (!participant) {
        return NextResponse.json({ error: 'Only the host or riders from this run can report it' }, { status: 403 });
      }
    }
  }

  const { data: profile } = await admin
    .from('users')
    .select('id, email, name, username, hide_display_name, role, avatar_url, is_verified')
    .eq('id', user.id)
    .maybeSingle();

  const trailName = String(
    (trail as { name?: unknown; title?: unknown }).name ??
    (trail as { title?: unknown }).title ??
    raw.trail_name ??
    trailId
  );
  const userName = resolvePublicDisplayName({
    id: user.id,
    email: (profile as { email?: string | null } | null)?.email ?? user.email ?? null,
    name: (profile as { name?: string | null } | null)?.name ?? null,
    username: (profile as { username?: string | null } | null)?.username ?? null,
    hide_display_name: (profile as { hide_display_name?: boolean | null } | null)?.hide_display_name ?? null,
  });

  const reportRow = {
    trail_id: trailId,
    run_id: runId,
    user_id: user.id,
    condition_status: conditionStatus,
    difficulty_today: difficultyToday,
    surface_conditions: surfaceConditions,
    hazards,
    hazards_note: hazardsNote,
    weather,
    body,
    photo_urls: photoUrls,
  };

  const reportInsert = await insertReturningIdAdaptive(admin, 'trail_reports', reportRow);
  if (reportInsert.error || !reportInsert.data) {
    return NextResponse.json({ error: reportInsert.error?.message ?? 'Could not save report' }, { status: 500 });
  }

  const feedBody = buildTrailReportFeedBody({
    trailName,
    condition_status: conditionStatus,
    difficulty_today: difficultyToday,
    surface_conditions: surfaceConditions,
    hazards,
    hazards_note: hazardsNote,
    weather,
    body,
  });

  const postPayload: Record<string, unknown> = {
    user_id: user.id,
    user_name: userName,
    avatar_url: (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null,
    caption: feedBody,
    content: feedBody,
    body: feedBody,
    image_url: photoUrls[0] ?? null,
    role: String((profile as { role?: string | null } | null)?.role ?? 'user'),
    verified: Boolean((profile as { is_verified?: boolean | null } | null)?.is_verified),
    trail_report_id: reportInsert.data.id,
    trail_id: trailId,
  };

  let postInsert = await insertReturningIdAdaptive(admin, 'posts', postPayload);
  if (postInsert.error && !photoUrls[0] && /image_url|not-null|null value/i.test(postInsert.error.message)) {
    postInsert = await insertReturningIdAdaptive(admin, 'posts', {
      ...postPayload,
      image_url: 'https://dummyimage.com/1x1/111111/111111.png',
    });
  }

  if (postInsert.error || !postInsert.data) {
    await admin.from('trail_reports').delete().eq('id', reportInsert.data.id);
    return NextResponse.json({ error: postInsert.error?.message ?? 'Could not create feed post' }, { status: 500 });
  }

  await admin
    .from('trail_reports')
    .update({ feed_post_id: postInsert.data.id })
    .eq('id', reportInsert.data.id);

  return NextResponse.json({
    ok: true,
    reportId: reportInsert.data.id,
    feedPostId: postInsert.data.id,
  });
}
