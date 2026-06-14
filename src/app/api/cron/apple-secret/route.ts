import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rotateAppleSignInSecret } from '@/lib/apple/rotateSecret';
import { authorizeCronRequest } from '@/lib/api/security';
import { getSupabaseUrl } from '@/utils/supabase/env';

export const runtime = 'nodejs';

/**
 * Regenerates the Apple OAuth client secret JWT and pushes it to Supabase Auth.
 * Schedule monthly in vercel.json — Apple JWTs expire after ~6 months; the .p8 key does not.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const admin =
    url && serviceKey
      ? createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : undefined;

  const result = await rotateAppleSignInSecret('cron', admin);

  if (!result.ok) {
    console.error('[cron/apple-secret]', result.error, result.hint ?? '');
    return NextResponse.json(
      { error: result.error, hint: result.hint },
      { status: result.status }
    );
  }

  console.info('[cron/apple-secret] rotated; valid until', result.expiresAt);
  return NextResponse.json({
    ok: true,
    servicesId: result.servicesId,
    bundleId: result.bundleId,
    expiresAt: result.expiresAt,
  });
}
