'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * After OAuth link completes, anonymous guests still have is_guest=true until upgraded.
 */
export function GuestUpgradeSync() {
  const { user, profile, loading, completeGuestUpgrade } = useAuth();
  const router = useRouter();
  const ranRef = useRef(false);

  useEffect(() => {
    if (loading || !user || ranRef.current) return;
    if (!profile?.is_guest || user.is_anonymous) return;

    ranRef.current = true;
    void (async () => {
      try {
        const result = await completeGuestUpgrade();
        if (result.upgraded) {
          router.replace('/feed/');
        }
      } catch {
        ranRef.current = false;
      }
    })();
  }, [loading, user, profile?.is_guest, completeGuestUpgrade, router]);

  return null;
}
