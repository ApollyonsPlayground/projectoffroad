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
        className="px-4 py-2.5 rounded-xl text-sm font-black text-orange-400 border border-orange-500/40 bg-orange-500/[0.07] hover:bg-orange-500/15 hover:border-orange-400/60 hover:text-orange-300 transition-all shadow-[0_0_20px_-8px_rgba(249,115,22,0.45)]"
      >
        Join the beta
      </Link>
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

