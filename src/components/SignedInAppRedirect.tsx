'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isCapacitorNative } from '@/utils/capacitator/isNative';

const PUBLIC_ENTRY_PATHS = new Set(['/', '']);

/**
 * Signed-in users skip the marketing homepage and go straight to the app feed.
 */
export function SignedInAppRedirect() {
  const { user, loading, isGuest } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isCapacitorNative()) return;
    if (loading || !user || isGuest) return;
    const path = pathname ?? '/';
    if (PUBLIC_ENTRY_PATHS.has(path)) {
      router.replace('/feed/');
    }
  }, [loading, user, pathname, router]);

  return null;
}
