import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isCapacitorNative } from '@/utils/capacitator/isNative';

function readCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function isLightBackground(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55;
}

/** Sync Capacitor status bar with current UI preset CSS variables. */
export async function syncNativeStatusBar(): Promise<void> {
  if (!isCapacitorNative()) return;
  const platform = Capacitor.getPlatform();
  if (platform !== 'android' && platform !== 'ios') return;

  try {
    const bg = readCssVar('--theme-color-meta', readCssVar('--background', '#000000'));
    const light = isLightBackground(bg);
    await StatusBar.setStyle({ style: light ? Style.Light : Style.Dark });
    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: bg });
    }
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    /* plugin unavailable in web or older builds */
  }
}
