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
        href="/feed/"
        className="px-4 py-2.5 rounded-xl bg-orange-500 text-black text-sm font-black hover:bg-orange-400 transition-colors"
      >
        Open app
      </Link>
      {!showSignedIn && (
        <Link
          href="/login/"
          className="px-4 py-2.5 rounded-xl border border-zinc-700 text-sm font-bold text-white hover:border-orange-500/60 transition-colors"
        >
          Sign in
        </Link>
      )}
    </nav>
  );
}

