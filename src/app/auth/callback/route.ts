import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase/server';

function looksLikeCapacitor(ua: string | null): boolean {
  if (!ua) return false;
  const s = ua.toLowerCase();
  // Capacitor's UA often contains "Capacitor". Some Android WebViews only show "wv",
  // but we keep the check narrow to avoid misclassifying normal mobile browsers.
  return s.includes('capacitor');
}

function looksLikeAndroid(ua: string | null): boolean {
  if (!ua) return false;
  return ua.toLowerCase().includes('android');
}

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
  const native = url.searchParams.get('native') === '1';

  const loginErr = (message: string) => {
    const login = new URL('/login/', url.origin);
    login.searchParams.set('error', 'auth_callback');
    login.searchParams.set('message', encodeURIComponent(message));
    return NextResponse.redirect(login);
  };

  if (!code) {
    return loginErr('No authorization code returned. Try signing in again.');
  }

  // If this callback is being opened inside the Capacitor WebView, DO NOT exchange
  // on the server: the PKCE verifier was stored in native storage by the app.
  // Bounce into the app deep link so the app can call exchangeCodeForSession().
  if (native || looksLikeCapacitor(request.headers.get('user-agent'))) {
    const deep = new URL('com.socaloffroaders.app://auth/callback');
    deep.searchParams.set('code', code);
    if (nextPath) deep.searchParams.set('next', nextPath);

    // Android Chrome/Custom Tabs are more consistent with intent:// than custom schemes.
    const androidIntent = looksLikeAndroid(request.headers.get('user-agent'))
      ? `intent://auth/callback?code=${encodeURIComponent(code)}${nextPath ? `&next=${encodeURIComponent(nextPath)}` : ''}#Intent;scheme=com.socaloffroaders.app;package=com.socaloffroaders.app;end`
      : null;

    // Some Android browsers/custom tabs crash or ignore automatic custom-scheme redirects.
    // Serve a tiny page with an explicit user gesture (button) to open the app.
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Continue in app</title>
    <style>
      body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#000; color:#fff; }
      .wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
      .card { width:100%; max-width:420px; border:1px solid #27272a; background:#09090b; border-radius:16px; padding:20px; }
      .btn { display:block; width:100%; text-align:center; padding:14px 16px; border-radius:12px; background:#f97316; color:#000; font-weight:800; text-decoration:none; }
      .muted { margin-top:10px; font-size:12px; color:#a1a1aa; line-height:1.4; }
      .title { font-weight:900; letter-spacing:-0.02em; margin:0 0 10px 0; font-size:18px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <p class="title">Finishing sign-in…</p>
        <a class="btn" href="${androidIntent ?? deep.toString()}" id="continue">Continue in the app</a>
        <p class="muted">
          Tap the button above to return to the app and finish sign-in.
          If Safari says the address is invalid, install the latest TestFlight build
          (the app must register the <code>com.socaloffroaders.app</code> link handler).
        </p>
        <script>
          (function() {
            try {
              // Avoid automatic redirects — they can crash/blank some custom tabs.
              // Keep the page stable and rely on explicit user action.
              var el = document.getElementById('continue');
              if (el) el.focus();
            } catch (e) {}
          })();
        </script>
      </div>
    </div>
  </body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
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
