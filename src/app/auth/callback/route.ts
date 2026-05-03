import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/server';

/**
 * OAuth PKCE return URL — exchanges ?code= for a session and sets auth cookies.
 * Add this exact URL (including trailing slash if you use trailingSlash: true) to
 * Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const nextRaw = url.searchParams.get('next') ?? '/';
  const nextPath = nextRaw.startsWith('/') ? nextRaw : `/${nextRaw}`;

  const loginErr = (message: string) => {
    const login = new URL('/login/', url.origin);
    login.searchParams.set('error', 'auth_callback');
    login.searchParams.set('message', encodeURIComponent(message));
    return NextResponse.redirect(login);
  };

  if (!code) {
    return loginErr('No authorization code returned. Try signing in again.');
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return loginErr('Server missing Supabase URL or anon/publishable key.');
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return loginErr(error.message);
  }

  return NextResponse.redirect(new URL(nextPath === '/' ? '/' : nextPath, url.origin));
}
