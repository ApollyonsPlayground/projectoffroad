import { Capacitor } from '@capacitor/core';

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  // Primary: Capacitor runtime API.
  if (Capacitor?.isNativePlatform?.()) return true;
  // Fallback: global binding (some setups expose it on window).
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return Boolean(w.Capacitor?.isNativePlatform?.());
}

