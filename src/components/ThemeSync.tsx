'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export const THEME_STORAGE_KEY = 'socal_ui_theme';
const VALID = new Set(['dark', 'light', 'blue']);

export type UiTheme = 'dark' | 'light' | 'blue';

export function ThemeSync() {
  const { profile } = useAuth();

  useEffect(() => {
    let theme: UiTheme = 'dark';
    const fromProfile = profile?.ui_theme;
    if (typeof fromProfile === 'string' && VALID.has(fromProfile)) {
      theme = fromProfile as UiTheme;
    } else if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && VALID.has(stored)) theme = stored as UiTheme;
    }

    document.documentElement.setAttribute('data-theme', theme);
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
    meta.setAttribute(
      'content',
      theme === 'light' ? '#f4f4f5' : theme === 'blue' ? '#0a1628' : '#000000'
    );
  }, [profile?.ui_theme]);

  return null;
}
