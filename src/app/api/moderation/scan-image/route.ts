import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ScanResult } from '@/lib/moderation/sightengine';
import {
  isOwnPostImagePublicUrl,
  scanImageBuffer,
  scanImageByPublicUrl,
} from '@/lib/moderation/sightengine';

export const runtime = 'nodejs';

/** Max image size for scan (bytes) — multipart fallback only */
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

function jsonFromScan(scan: ScanResult) {
  if (scan.skipped) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      moderation_scores: null,
      reason: scan.reason ?? 'moderation_not_configured',
    });
  }
  if (!scan.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: scan.reason,
        moderation_scores: scan.moderation_scores,
      },
      { status: 422 },
    );
  }
  return NextResponse.json({
    ok: true,
    skipped: false,
    moderation_scores: scan.moderation_scores,
  });
}

/**
 * POST — requires logged-in user (Authorization Bearer).
 *
 * Preferred: `Content-Type: application/json` body `{ "url": "<public post-images URL>" }`
 * after uploading to Storage — avoids **413** on large images (Vercel request body limit).
 *
 * Legacy: `multipart/form-data` field `file` (may 413 on big files on serverless).
 *
 * 1. If `SIGHTENGINE_*` set on this server → Sightengine (URL or bytes).
 * 2. Else → proxy bytes to Supabase Edge `scan-upload` (multipart only).
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

  const userId = userData.user.id;
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const raw = (await request.json()) as { url?: string };
      const imageUrl = typeof raw?.url === 'string' ? raw.url.trim() : '';
      if (!imageUrl) {
        return NextResponse.json({ error: 'Missing url' }, { status: 400 });
      }
      if (!isOwnPostImagePublicUrl(imageUrl, url, userId)) {
        return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
      }

      const sightUser = process.env.SIGHTENGINE_API_USER?.trim();
      const sightSecret = process.env.SIGHTENGINE_API_SECRET?.trim();
      if (sightUser && sightSecret) {
        const scan = await scanImageByPublicUrl(imageUrl);
        return jsonFromScan(scan);
      }

      return NextResponse.json({
        ok: true,
        skipped: true,
        moderation_scores: null,
        reason: 'moderation_not_configured',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[scan-image] json', msg);
      return NextResponse.json({
        ok: true,
        skipped: true,
        moderation_scores: null,
        reason: 'scan_internal_error',
      });
    }
  }

  try {
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

    const sightUser = process.env.SIGHTENGINE_API_USER?.trim();
    const sightSecret = process.env.SIGHTENGINE_API_SECRET?.trim();
    if (sightUser && sightSecret) {
      const scan = await scanImageBuffer(buf, mime);
      return jsonFromScan(scan);
    }

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
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[scan-image]', msg);
    return NextResponse.json({
      ok: true,
      skipped: true,
      moderation_scores: null,
      reason: 'scan_internal_error',
    });
  }
}
