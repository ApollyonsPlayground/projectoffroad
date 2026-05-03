'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface ViewTransitionsProps {
  children: ReactNode;
}

/**
 * Previously intercepted `<a>` clicks to wrap Next navigations in `document.startViewTransition`.
 * That broke taps / routing on multiple mobile browsers (Chrome Android in particular).
 * Keep this wrapper so imports stay stable; navigation uses Next defaults everywhere.
 */
export function ViewTransitions({ children }: ViewTransitionsProps) {
  return <>{children}</>;
}

// Hook for programmatic navigation — plain router.push (no View Transition API).
export function useViewTransition() {
  const router = useRouter();

  return (href: string) => {
    router.push(href);
  };
}
