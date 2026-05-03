'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface ViewTransitionsProps {
  children: ReactNode;
}

export function ViewTransitions({ children }: ViewTransitionsProps) {
  const router = useRouter();

  useEffect(() => {
    // Check if View Transition API is supported
    if (!document.startViewTransition) {
      return;
    }

    // Intercept link clicks for smooth transitions
    const handleClick = (e: MouseEvent) => {
      // Next.js <Link> already prevented default + navigated — don't double-push (breaks routes).
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const el = e.target instanceof Element ? e.target : null;
      const anchor = el?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target ||
        anchor.hasAttribute('download') ||
        !anchor.href.startsWith(window.location.origin)
      ) {
        return;
      }

      e.preventDefault();

      const url = new URL(anchor.href);
      const dest = `${url.pathname}${url.search}${url.hash}`;
      document.startViewTransition(() => {
        router.push(dest);
      });
    };

    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [router]);

  return <>{children}</>;
}

// Hook for programmatic navigation with transition
export function useViewTransition() {
  const router = useRouter();
  
  return (href: string) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        router.push(href);
      });
    } else {
      router.push(href);
    }
  };
}

// CSS animations for view transitions - add to globals.css
// .view-transition-enter { opacity: 0; transform: translateX(20px); }
// .view-transition-enter-active { opacity: 1; transform: translateX(0); transition: all 300ms ease-out; }
// .view-transition-exit { opacity: 1; transform: translateX(0); }
// .view-transition-exit-active { opacity: 0; transform: translateX(-20px); transition: all 300ms ease-in; }