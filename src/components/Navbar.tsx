'use client';

import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();

  return (
    <nav className="border-b border-border bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6 md:gap-8 min-w-0">
            <Link href="/feed/" className="text-lg md:text-xl font-black tracking-tight shrink-0">
              <span className="text-primary">SOCAL</span>
              <span className="text-foreground">OFFROADERS</span>
            </Link>

            <div className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <Link href="/search/" className="text-muted-foreground hover:text-primary transition">
                Search
              </Link>
              <Link href="/trails/" className="text-muted-foreground hover:text-primary transition">
                Trails
              </Link>
              <Link href="/runs/" className="text-muted-foreground hover:text-primary transition">
                Runs
              </Link>
              <Link href="/clubs/" className="text-muted-foreground hover:text-primary transition">
                CLUBS
              </Link>
              <Link href="/menu/" className="text-muted-foreground hover:text-primary transition inline-flex items-center gap-1">
                <LayoutGrid size={14} className="opacity-80" aria-hidden />
                More
              </Link>
              {user && (
                <>
                  <Link href="/dashboard/" className="text-muted-foreground hover:text-primary transition">
                    Dashboard
                  </Link>
                  <Link href="/achievements/" className="text-muted-foreground hover:text-primary transition">
                    Badges
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <>
                <Link
                  href="/profile/"
                  className="flex items-center gap-2 rounded-full hover:opacity-90"
                  aria-label="Profile"
                >
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {(profile?.name as string | undefined)?.charAt(0) || 'U'}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="text-sm text-muted-foreground hover:text-destructive transition"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login/" className="text-sm text-muted-foreground hover:text-primary transition">
                  Sign in
                </Link>
                <Link
                  href="/register/"
                  className="text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
