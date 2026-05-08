import { NextResponse } from 'next/server';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/utils/supabase/env';

export const dynamic = 'force-dynamic';

/**
 * Quick check that this deployment can reach your Supabase Auth service.
 * Open in a browser: `/api/health/supabase` (no secrets returned).
 */
export async function GET() {
  const base = getSupabaseUrl().replace(/\/$/, '');
  const hasKey = Boolean(getSupabaseAnonKey());

  if (!base) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        hasPublishableOrAnonKey: hasKey,
        message:
          'NEXT_PUBLIC_SUPABASE_URL is missing on this server. Set it in Vercel (Production) or .env.local and redeploy / restart dev.',
      },
      { status: 503 },
    );
  }

  if (!hasKey) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        hasPublishableOrAnonKey: false,
        message:
          'Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — Supabase Auth expects an `apikey` header on requests.',
      },
      { status: 503 },
    );
  }

  const anonOrPublishable = getSupabaseAnonKey();

  let host: string;
  try {
    host = new URL(base).hostname;
  } catch {
    host = '(invalid URL)';
  }

  const healthUrl = `${base}/auth/v1/health`;

  try {
    const res = await fetch(healthUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
      headers: {
        apikey: anonOrPublishable,
        Authorization: `Bearer ${anonOrPublishable}`,
      },
    });
    const text = await res.text();
    const ok = res.ok;

    let hint: string | undefined;
    if (!ok) {
      if (res.status === 401 || res.status === 403) {
        hint =
          'Invalid or revoked anon/publishable key — copy a fresh key from Supabase → Settings → API.';
      } else if (res.status >= 500) {
        hint =
          'Auth service may be temporarily unhealthy — check the project dashboard and status.supabase.com.';
      }
    }

    return NextResponse.json({
      ok,
      configured: true,
      hasPublishableOrAnonKey: true,
      supabaseHost: host,
      authHealthHttpStatus: res.status,
      message: ok
        ? 'Supabase Auth is reachable from this app server with your public key.'
        : `Supabase Auth returned HTTP ${res.status}.${hint ? ` ${hint}` : ' Check the dashboard: project active and services healthy.'}`,
      bodyPreview: ok ? undefined : text.slice(0, 240),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        hasPublishableOrAnonKey: true,
        supabaseHost: host,
        authHealthHttpStatus: null,
        message: `Could not reach ${healthUrl}: ${msg}. Often: wrong NEXT_PUBLIC_SUPABASE_URL, project deleted/paused, local network/DNS, or a temporary Supabase outage (status.supabase.com).`,
      },
      { status: 503 },
    );
  }
}
