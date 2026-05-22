import { Capacitor } from '@capacitor/core';

/** True when running inside the Capacitor iOS shell (not Safari, not Android). */
export function isIosNative(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.getPlatform() === 'ios';
}
