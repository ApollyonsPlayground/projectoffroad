import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/** Max image size for scan (bytes) */
const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Edge function slug under `${SUPABASE_URL}/functions/v1/{slug}`.
 * Override if you deployed a different name (e.g. super-endpoint).
 */
function scanEdgeSlug(): string {
  const raw = process.env.SUPABASE_IMAGE_SCAN_EDGE_FN?.trim();
  if (raw) return raw.replace(/^\/+|\/+$/g, '');
  return 'scan-upload';
}

/**
 * POST multipart/form-data with field "file" — requires logged-in user.
 * Proxies to Supabase Edge Function `scan-upload` so Sightengine keys stay on Supabase only.
 * Returns { ok, skipped?, reason?, moderation_scores? }
 */
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const anon = createClient(url, anonKey);
  const { data: userData, error: authErr } = await anon.auth.getUser(token);
  if (authErr || !userData.user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }

  const mime = file.type || 'image/jpeg';
  const forward = new FormData();
  forward.append('file', new Blob([buf], { type: mime }), 'upload');

  const base = url.replace(/\/+$/, '');
  const edgeUrl = `${base}/functions/v1/${scanEdgeSlug()}`;

  let edgeRes: Response;
  try {
    edgeRes = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
      body: forward,
    });
  } catch {
    // Edge Function offline / DNS — same as optional Sightengine (feed treats skipped → pending_no_engine).
    return NextResponse.json({
      ok: true,
      skipped: true,
      moderation_scores: null,
      reason: 'scan_service_unreachable',
    });
  }

  const rawText = await edgeRes.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
  } catch {
    payload = {};
  }

  if (!edgeRes.ok) {
    const status = edgeRes.status;
    const hasMessage =
      typeof payload.error === 'string' ||
      typeof payload.reason === 'string';
    const emptyBody = rawText.trim().length === 0;

    // Undeployed Edge Function (HTML 404) or gateway errors — don’t block posting.
    if (
      status === 404 ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      (status >= 500 && status < 600 && !hasMessage && emptyBody)
    ) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        moderation_scores: null,
        reason: 'scan_service_unavailable',
      });
    }

    const fallback =
      typeof payload.error === 'string'
        ? payload.error
        : typeof payload.reason === 'string'
          ? payload.reason
          : status === 400
            ? 'Invalid image upload (try another photo or format).'
            : `Image check failed (${status})`;

    return NextResponse.json(
      { ...payload, error: fallback },
      { status: edgeRes.status },
    );
  }

  return NextResponse.json(payload, { status: edgeRes.status });
}
