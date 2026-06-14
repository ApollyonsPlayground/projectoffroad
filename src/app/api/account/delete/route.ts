import { NextResponse } from 'next/server';
import { createClient, type User } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/utils/supabase/server';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/utils/supabase/env';
import { assertTrustedBrowserRequest } from '@/lib/api/security';

export const runtime = 'nodejs';

async function resolveDeleteRequestUser(request: Request): Promise<User | null> {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;

  const bearer = request.headers.get('authorization')?.trim() ?? '';
  const token = bearer.startsWith('Bearer ') ? bearer.slice(7).trim() : null;

  if (token) {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
    error: authReadErr,
  } = await supabase.auth.getUser();

  if (authReadErr || !user) return null;
  return user;
}

/**
 * Authenticated user permanently deletes their Supabase auth user (and cascaded app data).
 * Intended for Play Console “delete account” URL + GDPR/CCPA self-service.
 */
export async function POST(request: Request) {
  if (!assertTrustedBrowserRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const confirm =
    typeof body === 'object' &&
    body !== null &&
    (body as { confirm?: unknown }).confirm === true;

  if (!confirm) {
    return NextResponse.json({ error: 'You must confirm account deletion.' }, { status: 400 });
  }

  const user = await resolveDeleteRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Sign in to delete your account.' }, { status: 401 });
  }

  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: delAuthErr } = await admin.auth.admin.deleteUser(user.id);

  if (delAuthErr) {
    console.error('[account/delete] auth.admin.deleteUser', delAuthErr);
    return NextResponse.json(
      { error: 'Could not delete account. Email support if this persists.' },
      { status: 400 }
    );
  }

  await admin.from('users').delete().eq('id', user.id);

  return NextResponse.json({ ok: true });
}
