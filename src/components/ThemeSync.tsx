'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_UI_PRESET, normalizeUiPreset, presetDefaultShell } from '@/lib/ui/uiPresets';
import {
  applyThemeTokensToDocument,
  clearCustomThemeTokensFromDocument,
  resolveUserThemeApplication,
} from '@/lib/ui/themeEngine';
import { syncNativeStatusBar } from '@/lib/native/syncNativeStatusBar';

export const THEME_STORAGE_KEY = 'socal_ui_theme';

const LEGACY_STORAGE = new Set(['dark', 'light', 'blue', 'void-teal-violet']);

function readStoredPreset(): string | null {
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

export type UiTheme = ReturnType<typeof normalizeUiPreset>;

function applyShellAttribute(shell: 'dark' | 'light') {
  document.documentElement.setAttribute('data-ui-shell', shell);
}

export function ThemeSync() {
  const { profile } = useAuth();

  useEffect(() => {
    const profileRecord = profile as Record<string, unknown> | null;
    const fromProfile = profileRecord
      ? {
          ui_theme: profileRecord.ui_theme as string | undefined,
          ui_shell: profileRecord.ui_shell as string | undefined,
          ui_primary_color: profileRecord.ui_primary_color as string | undefined,
          ui_secondary_color: profileRecord.ui_secondary_color as string | undefined,
        }
      : null;

    const resolved = fromProfile
      ? resolveUserThemeApplication(fromProfile)
      : {
          mode: 'preset' as const,
          preset: readStoredPreset() ?? DEFAULT_UI_PRESET,
          shell: 'dark' as const,
        };

    const presetId =
      resolved.mode === 'custom'
        ? DEFAULT_UI_PRESET
        : normalizeUiPreset(resolved.preset);

    if (resolved.mode === 'custom' && resolved.tokens) {
      document.documentElement.setAttribute('data-ui-theme-mode', 'custom');
      document.documentElement.setAttribute('data-ui-preset', presetId);
      clearCustomThemeTokensFromDocument();
      applyThemeTokensToDocument(resolved.tokens);
      applyShellAttribute(resolved.shell);
    } else {
      document.documentElement.setAttribute('data-ui-theme-mode', 'preset');
      document.documentElement.setAttribute('data-ui-preset', presetId);
      clearCustomThemeTokensFromDocument();
      const shell =
        fromProfile?.ui_shell === 'light' || fromProfile?.ui_shell === 'dark'
          ? fromProfile.ui_shell
          : presetDefaultShell(
              presetId === 'custom' ? DEFAULT_UI_PRESET : (presetId as typeof DEFAULT_UI_PRESET)
            );
      applyShellAttribute(shell);
    }

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

    void syncNativeStatusBar();
  }, [
    profile?.ui_theme,
    (profile as { ui_shell?: string })?.ui_shell,
    (profile as { ui_primary_color?: string })?.ui_primary_color,
    (profile as { ui_secondary_color?: string })?.ui_secondary_color,
  ]);

  return null;
}
