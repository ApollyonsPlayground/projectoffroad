import { Capacitor } from '@capacitor/core';
import { isCapacitorNative } from '@/utils/capacitator/isNative';

/** True when the native shell registered @capacitor/camera (requires cap sync ios + rebuild). */
export function isNativeCameraPluginAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isCapacitorNative()) return false;
  return Capacitor.isPluginAvailable('Camera');
}

export function isPluginUnimplementedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /not implemented/i.test(msg) || /plugin.*unavailable/i.test(msg);
}
