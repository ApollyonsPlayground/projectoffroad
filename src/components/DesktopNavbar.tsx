'use client';

import Navbar from '@/components/Navbar';

/** Top nav on tablet/desktop — complements BottomNav on phones. */
export function DesktopNavbar() {
  return (
    <header className="hidden md:block sticky top-0 z-[95] border-b border-border bg-background/95 backdrop-blur-md">
      <Navbar />
    </header>
  );
}
