'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isCapacitorNative } from '@/utils/capacitator/isNative';
import { AppBootSplash } from '@/components/boot/AppBootSplash';
import { needsOnboardingWizard } from '@/lib/ui/onboarding';

const MIN_SPLASH_MS = 2000;
const HOME_PATHS = new Set(['/', '']);

function normalizePath(path: string | null | undefined): string {
  if (!path || path === '') return '/';
  const trimmed = path.replace(/\/+$/, '') || '/';
  return trimmed;
}

/**
 * Native-only cold-start gate: splash while session restore runs, then route by auth.
 */
export function AppBootGate() {
  const { user, profile, loading, isGuest, guestRunId } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isNative = isCapacitorNative();
  const entryPathRef = useRef(normalizePath(pathname));
  const mountTimeRef = useRef(Date.now());
  const bootFinishedRef = useRef(false);

  const [splashVisible, setSplashVisible] = useState(isNative);

  useEffect(() => {
    if (!isNative) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isNative]);

  useEffect(() => {
    if (!isNative || bootFinishedRef.current || loading) return;

    let cancelled = false;

    const finishBoot = async () => {
      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
      await new Promise((r) => setTimeout(r, remaining));

      if (cancelled || bootFinishedRef.current) return;
      bootFinishedRef.current = true;

      const entryPath = entryPathRef.current;

      if (!user) {
        router.replace('/');
      } else if (isGuest && guestRunId) {
        router.replace(`/runs/${guestRunId}/`);
      } else if (HOME_PATHS.has(entryPath)) {
        router.replace(needsOnboardingWizard(profile) ? '/onboarding/' : '/feed/');
      }

      setSplashVisible(false);
      document.body.style.overflow = '';
    };

    void finishBoot();

    return () => {
      cancelled = true;
    };
  }, [isNative, loading, user, profile, isGuest, guestRunId, router]);

  if (!isNative) return null;

  return <AppBootSplash visible={splashVisible} />;
}
