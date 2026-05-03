'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const GlobalSOS = dynamic(() => import('@/components/GlobalSOS'), { ssr: false });

export default function ClientGlobalSOS() {
  const pathname = usePathname();
  const showOnRunDetail = typeof pathname === 'string' && /^\/runs\/[^/]+(\/|$)/.test(pathname);
  if (!showOnRunDetail) return null;
  return <GlobalSOS />;
}
