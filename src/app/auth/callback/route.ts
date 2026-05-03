import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/server';

/**
 * Only allow same-origin relative redirects after OAuth.
 * `next=//vercel.com/...` is protocol-relative and would otherwise leave your app (open redirect).
 */
function safeRelativePath(raw: string | null): string {
  if (raw == null || raw === '' || raw === '/') return '/';
  let s = raw.trim();
  if (s.length > 2048) return '/';
  if (!s.startsWith('/')) s = `/${s}`;
  if (s.startsWith('//')) return '/';
  if (s.includes('://')) return '/';
  if (s.includes('\\')) return '/';
  try {
    const u = new URL(s, 'https://example.invalid');
    const out = `${u.pathname}${u.search}${u.hash}`;
    return out.startsWith('/') && out !== '' ? out : '/';
  } catch {
    return '/';
  }
}

/**
 * OAuth PKCE return URL — exchanges ?code= for a session and sets auth cookies.
 * Add this exact URL (including trailing slash if you use trailingSlash: true) to
 * Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const nextPath = safeRelativePath(url.searchParams.get('next'));

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

  // Root `/` is the public marketing page; signed-in users land in the app feed.
  const dest = nextPath === '/' ? '/feed/' : nextPath;
  return NextResponse.redirect(new URL(dest, url.origin));
}
