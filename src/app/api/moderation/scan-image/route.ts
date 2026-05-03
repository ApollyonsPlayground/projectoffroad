import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scanImageBuffer } from '@/lib/moderation/sightengine';

export const runtime = 'nodejs';

/** Max image size for scan (bytes) */
const MAX_BYTES = 12 * 1024 * 1024;

/**
 * POST multipart/form-data with field "file" — requires logged-in user.
 * Returns { ok, skipped?, reason?, moderation_scores? }
 */
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
  const result = await scanImageBuffer(buf, mime);

  if (!result.ok && !result.skipped) {
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason ?? 'blocked',
        moderation_scores: result.rawScores ?? null,
      },
      { status: 422 }
    );
  }

  return NextResponse.json({
    ok: true,
    skipped: result.skipped,
    moderation_scores: result.rawScores ?? null,
  });
}
