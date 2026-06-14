'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/context/AuthContext';
import { isCapacitorNative } from '@/utils/capacitator/isNative';
import { isPushRegistrationEnabled } from '@/lib/push/pushConfig';
import { registerNativePush, unregisterNativePush } from '@/lib/push/registerNativePush';

/**
 * Silent native push token registration on sign-in (Android).
 * iOS requires GoogleService-Info.plist in the Xcode bundle — use Settings → Enable push notifications.
 */
export function PushRegistration() {
  const { user, supabaseClient } = useAuth();
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isPushRegistrationEnabled() || !isCapacitorNative() || !supabaseClient) return;

    const userId = user?.id ?? null;

    if (!userId) {
      if (lastUserId.current) {
        void unregisterNativePush(supabaseClient);
        lastUserId.current = null;
      }
      return;
    }

    // iOS: manual registration only (Settings) so Firebase is not initialized before plist is bundled.
    if (Capacitor.getPlatform() === 'ios') {
      lastUserId.current = userId;
      return;
    }

    lastUserId.current = userId;
    void registerNativePush(supabaseClient, userId);
  }, [user?.id, supabaseClient]);

  return null;
}
