'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isCapacitorNative } from '@/utils/capacitator/isNative';
import { isPushRegistrationEnabled } from '@/lib/push/pushConfig';
import { registerNativePush, unregisterNativePush } from '@/lib/push/registerNativePush';

/**
 * Silent native push token registration. No notifications are sent until server push is enabled.
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

    lastUserId.current = userId;
    void registerNativePush(supabaseClient, userId);
  }, [user?.id, supabaseClient]);

  return null;
}
