'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export function PublicHomeCtas() {
  const { user, loading } = useAuth();

  // Avoid flashing "Sign in" while auth is hydrating.
  const showSignedIn = !loading && Boolean(user);

  return (
    <nav className="flex flex-wrap items-center gap-2 sm:justify-end" aria-label="Primary">
      <Link
        href="/beta/"
        className="px-4 py-2.5 rounded-xl text-sm font-black text-primary/90 border border-primary/40 bg-primary/[0.07] hover:bg-primary/15 hover:border-primary/60 hover:text-primary/80 transition-all shadow-[0_0_20px_-8px_color-mix(in_srgb,var(--primary)_45%,transparent)]"
      >
        Join the beta
      </Link>
      <Link
        href="/feed/"
        className="px-4 py-2.5 rounded-xl bg-primary text-black text-sm font-black hover:bg-primary/90 transition-colors"
      >
        Open app
      </Link>
      {!showSignedIn && (
        <Link
          href="/login/"
          className="px-4 py-2.5 rounded-xl border border-zinc-700 text-sm font-bold text-white hover:border-primary/60 transition-colors"
        >
          Sign in
        </Link>
      )}
    </nav>
  );
}

