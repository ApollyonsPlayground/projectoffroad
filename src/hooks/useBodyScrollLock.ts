import { useEffect } from 'react';

/**
 * Locks page scroll on mobile (iOS rubber-banding, feed pull-to-refresh, etc.).
 * Mark scrollable regions inside the overlay with `data-scroll-lock-allow`.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    const allowScroll = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('[data-scroll-lock-allow]'));

    const onTouchMove = (e: TouchEvent) => {
      if (!allowScroll(e.target)) e.preventDefault();
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
