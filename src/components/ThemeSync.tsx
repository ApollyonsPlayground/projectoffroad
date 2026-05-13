'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_UI_PRESET, normalizeUiPreset, type UiPresetId } from '@/lib/ui/uiPresets';

export const THEME_STORAGE_KEY = 'socal_ui_theme';

const LEGACY_STORAGE = new Set(['dark', 'light', 'blue']);

function readStoredPreset(): UiPresetId | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!stored) return null;
    if (LEGACY_STORAGE.has(stored)) {
      return normalizeUiPreset(stored);
    }
    return normalizeUiPreset(stored);
  } catch {
    return null;
  }
}

export type UiTheme = UiPresetId;

export function ThemeSync() {
  const { profile } = useAuth();

  useEffect(() => {
    const fromProfile = typeof profile?.ui_theme === 'string' ? profile.ui_theme : undefined;
    const preset: UiPresetId = fromProfile
      ? normalizeUiPreset(fromProfile)
      : readStoredPreset() ?? DEFAULT_UI_PRESET;

    document.documentElement.setAttribute('data-ui-preset', preset);
    document.documentElement.removeAttribute('data-theme');

    document.documentElement.style.backgroundColor = 'var(--background)';
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.backgroundColor = 'var(--background)';
      document.body.style.color = 'var(--foreground)';
    }

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    const metaColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-color-meta').trim();
    meta.setAttribute('content', metaColor || '#000000');
  }, [profile?.ui_theme]);

  return null;
}
