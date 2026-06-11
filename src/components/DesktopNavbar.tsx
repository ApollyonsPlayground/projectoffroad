'use client';

import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';

/** Top nav on tablet/desktop — complements BottomNav on phones. */
export function DesktopNavbar() {
  const { isGuest } = useAuth();
  if (isGuest) return null;

  return (
    <header className="hidden md:block sticky top-0 z-[95] border-b border-border bg-background/95 backdrop-blur-md">
      <Navbar />
    </header>
  );
}
