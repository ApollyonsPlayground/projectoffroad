import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/utils/supabase/env';
import { hostnameLooksLikePrivateLan, supabaseCookieOptions } from '@/utils/supabase/cookieOptions';

function cookieSecureFromRequest(request: NextRequest): boolean {
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (proto === 'http') return false;
  if (proto === 'https') return true;
  try {
    const u = new URL(request.url);
    return u.protocol === 'https:';
  } catch {
    const host = request.headers.get('host') ?? '';
    return !hostnameLooksLikePrivateLan(host);
  }
}

function redirectLogin(request: NextRequest, message: string) {
  const login = new URL('/login/', request.url);
  login.searchParams.set('error', 'play_review');
  login.searchParams.set('message', encodeURIComponent(message));
  return NextResponse.redirect(login);
}

/**
 * Password login for a dedicated Supabase user — intended ONLY for Google Play reviewers.
 * POST body must include `email` + `password` (form or JSON). Email must match PLAY_REVIEW_EMAIL;
 * password is checked by Supabase. Disable via PLAY_REVIEW_LOGIN_ENABLED after review.
 *
 * Supabase Dashboard → Authentication → Providers → Email must allow password sign-in for this user.
 */
export async function POST(request: NextRequest) {
  const enabled = process.env.PLAY_REVIEW_LOGIN_ENABLED?.trim() === 'true';
  if (!enabled) {
    return redirectLogin(request, 'Review sign-in is not enabled on this deployment.');
  }

  const allowedEmail = process.env.PLAY_REVIEW_EMAIL?.trim();

  if (!allowedEmail) {
    return redirectLogin(request, 'Review account is not configured.');
  }

  let emailInput = '';
  let passwordInput = '';
  try {
    const ct = request.headers.get('content-type') ?? '';
    if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
      const formData = await request.formData();
      emailInput = String(formData.get('email') ?? '').trim();
      passwordInput = String(formData.get('password') ?? '');
    } else if (ct.includes('application/json')) {
      const body = (await request.json()) as { email?: unknown; password?: unknown };
      emailInput = String(body?.email ?? '').trim();
      passwordInput = String(body?.password ?? '');
    } else {
      return redirectLogin(request, 'Use the email and password form to sign in.');
    }
  } catch {
    return redirectLogin(request, 'Invalid request.');
  }

  if (!emailInput || !passwordInput) {
    return redirectLogin(request, 'Enter the reviewer email and password.');
  }

  if (emailInput.toLowerCase() !== allowedEmail.toLowerCase()) {
    return redirectLogin(request, 'Invalid email or password.');
  }

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    return redirectLogin(request, 'Server is missing Supabase URL or anon/publishable key.');
  }

  const response = NextResponse.redirect(new URL('/feed/', request.url));

  const secure = cookieSecureFromRequest(request);

  const supabase = createServerClient(url, key, {
    cookieOptions: supabaseCookieOptions(secure),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({
    email: allowedEmail,
    password: passwordInput,
  });

  if (error) {
    return redirectLogin(request, error.message || 'Review sign-in failed.');
  }

  return response;
}
