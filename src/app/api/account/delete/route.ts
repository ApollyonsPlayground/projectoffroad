import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/utils/supabase/server';
import { getSupabaseUrl } from '@/utils/supabase/env';

export const runtime = 'nodejs';

/**
 * Authenticated user permanently deletes their Supabase auth user (and cascaded app data).
 * Intended for Play Console “delete account” URL + GDPR/CCPA self-service.
 */
export async function POST(request: Request) {
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

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const {
    data: { user },
    error: authReadErr,
  } = await supabase.auth.getUser();

  if (authReadErr || !user) {
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
      {
        error:
          delAuthErr.message ||
          'Could not delete account. Email support if this persists.',
      },
      { status: 400 }
    );
  }

  await admin.from('users').delete().eq('id', user.id);

  return NextResponse.json({ ok: true });
}
