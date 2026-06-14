'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/context/AuthContext';
import { isCapacitorNative } from '@/utils/capacitator/isNative';
import { isPushRegistrationEnabled } from '@/lib/push/pushConfig';
import { needsOnboardingWizard } from '@/lib/ui/onboarding';
import { registerNativePush, unregisterNativePush } from '@/lib/push/registerNativePush';

/** Wait for cold-start splash / routing before the iOS permission dialog. */
const IOS_PUSH_PROMPT_DELAY_MS = 2_500;

/**
 * Native push token registration after sign-in. Triggers the system notification
 * permission prompt on first launch; iOS is delayed slightly so it does not overlap the splash.
 */
export function PushRegistration() {
  const { user, profile, loading, supabaseClient } = useAuth();
  const activeUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isPushRegistrationEnabled() || !isCapacitorNative() || !supabaseClient || loading) return;

    const userId = user?.id ?? null;

    if (!userId) {
      if (activeUserId.current) {
        void unregisterNativePush(supabaseClient);
        activeUserId.current = null;
      }
      return;
    }

    if (needsOnboardingWizard(profile)) return;

    const isIos = Capacitor.getPlatform() === 'ios';
    const delayMs = isIos ? IOS_PUSH_PROMPT_DELAY_MS : 0;
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      activeUserId.current = userId;
      void registerNativePush(supabaseClient, userId);
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user?.id, profile, loading, supabaseClient]);

  return null;
}
