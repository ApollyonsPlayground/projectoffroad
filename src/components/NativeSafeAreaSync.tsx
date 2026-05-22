'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/** Sets platform on <html> for iOS/Android safe-area CSS (Capacitor WebView). */
export function NativeSafeAreaSync() {
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const native = Capacitor.isNativePlatform();

    document.documentElement.dataset.capacitor = native ? 'native' : 'web';
    document.documentElement.dataset.platform = platform;

    return () => {
      delete document.documentElement.dataset.capacitor;
      delete document.documentElement.dataset.platform;
    };
  }, []);

  return null;
}
