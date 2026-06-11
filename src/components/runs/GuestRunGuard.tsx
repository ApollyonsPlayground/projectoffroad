'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const LEGAL_PREFIXES = ['/terms', '/privacy', '/child-safety'];

function normalizePath(path: string | null | undefined): string {
  if (!path) return '/';
  const trimmed = path.replace(/\/+$/, '') || '/';
  return trimmed;
}

export function GuestRunGuard() {
  const { isGuest, guestRunId, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !isGuest || !guestRunId) return;

    const path = normalizePath(pathname);
    if (LEGAL_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return;

    const runBase = `/runs/${guestRunId}`;
    const joinPath = `${runBase}/join`;
    const allowed =
      path === runBase ||
      path.startsWith(`${runBase}/`) ||
      path === joinPath ||
      path.startsWith(`${joinPath}/`);

    if (!allowed) {
      router.replace(`${runBase}/`);
    }
  }, [loading, isGuest, guestRunId, pathname, router]);

  return null;
}
