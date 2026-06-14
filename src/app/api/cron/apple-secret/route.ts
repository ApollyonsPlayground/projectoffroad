import { NextRequest, NextResponse } from 'next/server';
import {
  generateAppleClientSecret,
  patchSupabaseAppleAuthConfig,
  readAppleSignInKeyConfigFromEnv,
  readSupabaseManagementConfigFromEnv,
} from '@/lib/apple/clientSecret';
import { authorizeCronRequest } from '@/lib/api/security';

export const runtime = 'nodejs';

/**
 * Regenerates the Apple OAuth client secret JWT and pushes it to Supabase Auth.
 * Schedule monthly in vercel.json — Apple JWTs expire after ~6 months; the .p8 key does not.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apple = readAppleSignInKeyConfigFromEnv();
  if (!apple) {
    return NextResponse.json(
      {
        error: 'Missing Apple key env vars',
        hint: 'Set APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICES_ID, APPLE_PRIVATE_KEY on Vercel.',
      },
      { status: 503 }
    );
  }

  const mgmt = readSupabaseManagementConfigFromEnv();
  if (!mgmt) {
    return NextResponse.json(
      {
        error: 'Missing Supabase Management API config',
        hint: 'Set SUPABASE_ACCESS_TOKEN (dashboard → Account → Access Tokens) and SUPABASE_PROJECT_REF.',
      },
      { status: 503 }
    );
  }

  let secret: string;
  try {
    secret = generateAppleClientSecret(apple);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[cron/apple-secret] generate', msg);
    return NextResponse.json({ error: 'Could not sign Apple client secret', detail: msg }, { status: 500 });
  }

  const result = await patchSupabaseAppleAuthConfig({
    projectRef: mgmt.projectRef,
    accessToken: mgmt.accessToken,
    servicesId: apple.servicesId,
    secret,
    bundleId: apple.bundleId,
  });

  if (!result.ok) {
    console.error('[cron/apple-secret] patch', result.status, result.error);
    return NextResponse.json(
      { error: 'Supabase Management API rejected the update', status: result.status },
      { status: 502 }
    );
  }

  console.info('[cron/apple-secret] rotated Apple client secret; valid until', result.expiresAt);
  return NextResponse.json({
    ok: true,
    servicesId: apple.servicesId,
    bundleId: apple.bundleId ?? null,
    expiresAt: result.expiresAt,
  });
}
