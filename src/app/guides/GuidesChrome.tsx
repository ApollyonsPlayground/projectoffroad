'use client';

import BottomNav from '@/components/BottomNav';

export function GuidesChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-28">{children}</div>
      <BottomNav />
    </>
  );
}
