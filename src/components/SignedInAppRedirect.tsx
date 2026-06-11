'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { needsOnboardingWizard } from '@/lib/ui/onboarding';
import { isCapacitorNative } from '@/utils/capacitator/isNative';

const PUBLIC_ENTRY_PATHS = new Set(['/', '']);

/**
 * Signed-in users skip the marketing homepage and go straight to the app feed.
 */
export function SignedInAppRedirect() {
  const { user, profile, loading, isGuest } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isCapacitorNative()) return;
    if (loading || !user || isGuest) return;
    const path = pathname ?? '/';
    if (PUBLIC_ENTRY_PATHS.has(path)) {
      router.replace(needsOnboardingWizard(profile) ? '/onboarding/' : '/feed/');
    }
  }, [loading, user, profile, isGuest, pathname, router]);

  return null;
}
