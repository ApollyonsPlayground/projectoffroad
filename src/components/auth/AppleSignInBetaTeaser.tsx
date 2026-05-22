'use client';

import Link from 'next/link';

/** Web-only: Apple sign-in is TestFlight-only; directs users to the beta page. */
export function AppleSignInBetaTeaser() {
  return (
    <div
      className="w-full flex flex-col items-center justify-center gap-1 py-4 rounded-2xl border-2 border-border bg-muted/50 text-muted-foreground opacity-70 select-none"
      role="status"
      aria-label="Sign in with Apple — join the beta on iPhone"
    >
      <span className="flex items-center gap-2.5 font-bold text-[15px] text-muted-foreground">
        <svg width="18" height="22" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true" focusable="false">
          <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 138.3 204.5-1.5 3.2-21.6 73.7-71.3 145.4-44.2 63.5-90.1 126.9-162.1 127.8-71.1 1-94.1-42.1-175.3-42.1-81.2 0-106.6 41-173.9 43.5-69.5 2.6-122.5-69.5-166.7-133-90.8-131.8-160.5-372.3-67.1-534.2 45.7-79.2 127.4-129.4 216.3-130.8 67.4-1.3 131 45.3 171.3 45.3 40.2 0 115.9-56.9 195.5-48.4 33.3 1.4 126.6 13.4 186.5 100.4-4.8 3-111.3 65.1-111.3 194.2 0 153.8 120.1 207.6 126.3 210.9zM468.7 132.7c35.9-43.1 60.1-102.8 53.4-162.6-51.6 2.1-114.1 34.4-151.2 77.4-33.2 38.1-62.4 99.1-54.6 157.6 57.5 4.5 116.2-29.2 152.4-72.4z" />
        </svg>
        Continue with Apple
      </span>
      <Link
        href="/beta/"
        className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-primary/90 transition-colors underline-offset-2 hover:underline"
      >
        Join the beta to sign in with Apple
      </Link>
    </div>
  );
}
