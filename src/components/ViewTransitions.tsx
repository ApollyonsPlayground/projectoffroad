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
      const target = e.target as HTMLAnchorElement;
      
      // Only handle internal links
      if (
        target.tagName === 'A' &&
        target.href &&
        target.href.startsWith(window.location.origin) &&
        !target.target // Don't handle external links or new tabs
      ) {
        e.preventDefault();
        
        const href = target.href;
        
        // Start view transition
        document.startViewTransition(() => {
          router.push(href);
        });
      }
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