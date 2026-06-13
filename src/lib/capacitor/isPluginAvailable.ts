import { Capacitor } from '@capacitor/core';
import { isCapacitorNative } from '@/utils/capacitator/isNative';

export function isNativePluginAvailable(name: string): boolean {
  if (typeof window === 'undefined' || !isCapacitorNative()) return false;
  return Capacitor.isPluginAvailable(name);
}

export function isPluginUnimplementedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /not implemented/i.test(msg) || /plugin.*unavailable/i.test(msg);
}
