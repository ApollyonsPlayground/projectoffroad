import { Capacitor } from '@capacitor/core';

/** Native Apple sign-in is iOS-only; web can use OAuth fallback. Hidden on Android. */
export function showAppleSignIn(): boolean {
  if (typeof window === 'undefined') return false;
  const platform = Capacitor.getPlatform();
  return platform === 'ios' || platform === 'web';
}
