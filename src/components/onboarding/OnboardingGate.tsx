'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isOnboardingAllowedPath, needsOnboardingWizard } from '@/lib/ui/onboarding';

/**
 * Redirect new members to the onboarding wizard until username + theme are set.
 */
export function OnboardingGate() {
  const { user, profile, loading, isGuest } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user || isGuest) return;
    if (!needsOnboardingWizard(profile)) return;
    if (isOnboardingAllowedPath(pathname)) return;
    router.replace('/onboarding/');
  }, [loading, user, isGuest, profile, pathname, router]);

  return null;
}
