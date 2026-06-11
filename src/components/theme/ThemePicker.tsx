'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useToast } from '@/components/Toast';
import { THEME_STORAGE_KEY } from '@/components/ThemeSync';
import {
  applyThemeTokensToDocument,
  buildCustomThemeTokens,
  clearCustomThemeTokensFromDocument,
  CURATED_ACCENT_COLORS,
  normalizeHex,
} from '@/lib/ui/themeEngine';
import {
  DEFAULT_UI_PRESET,
  isPresetThemeId,
  normalizeUiPreset,
  PRESET_THEME_IDS,
  UI_PRESET_OPTIONS,
  type PresetThemeId,
  type UiShell,
} from '@/lib/ui/uiPresets';
import { saveUserTheme, type ThemeSelection } from '@/lib/ui/saveUserTheme';

export type ThemePickerProfile = {
  ui_theme?: string | null;
  ui_shell?: string | null;
  ui_primary_color?: string | null;
  ui_secondary_color?: string | null;
};

type Props = {
  supabaseClient: SupabaseClient;
  userId: string;
  profile: ThemePickerProfile | null | undefined;
  onApplied?: () => Promise<void>;
  /** When true, parent handles save on Continue (onboarding). */
  deferSave?: boolean;
  onSelectionChange?: (selection: ThemeSelection) => void;
  className?: string;
  showPreview?: boolean;
};

function readInitialSelection(profile: ThemePickerProfile | null | undefined): ThemeSelection {
  const theme = normalizeUiPreset(profile?.ui_theme);
  const shell: UiShell = profile?.ui_shell === 'light' ? 'light' : 'dark';

  if (theme === 'custom' && profile?.ui_primary_color) {
    return {
      mode: 'custom',
      shell,
      primaryColor: profile.ui_primary_color,
      secondaryColor: profile.ui_secondary_color,
    };
  }

  const preset = isPresetThemeId(theme) ? theme : DEFAULT_UI_PRESET;
  return { mode: 'preset', preset, shell };
}

export function ThemePicker({
  supabaseClient,
  userId,
  profile,
  onApplied,
  deferSave = false,
  onSelectionChange,
  className = '',
  showPreview = true,
}: Props) {
  const { showToast } = useToast();
  const [selection, setSelection] = useState<ThemeSelection>(() => readInitialSelection(profile));
  const [customPrimary, setCustomPrimary] = useState(
    () => normalizeHex(profile?.ui_primary_color) ?? '#f97316'
  );
  const [customSecondary, setCustomSecondary] = useState(
    () => normalizeHex(profile?.ui_secondary_color) ?? normalizeHex(profile?.ui_primary_color) ?? '#fb923c'
  );
  const [pending, setPending] = useState(false);

  const previewTokens = useMemo(() => {
    if (selection.mode === 'custom') {
      return buildCustomThemeTokens(selection.shell, customPrimary, customSecondary);
    }
    const preset = selection.preset ?? DEFAULT_UI_PRESET;
    const opt = UI_PRESET_OPTIONS.find((p) => p.id === preset);
    if (!opt) return null;
    return buildCustomThemeTokens(selection.shell, opt.preview.primary, opt.preview.primary);
  }, [selection, customPrimary, customSecondary]);

  const updateSelection = (next: ThemeSelection) => {
    setSelection(next);
    onSelectionChange?.(next);
  };

  const applyLocally = (next: ThemeSelection, primary?: string, secondary?: string) => {
    if (next.mode === 'custom' && primary) {
      document.documentElement.setAttribute('data-ui-theme-mode', 'custom');
      clearCustomThemeTokensFromDocument();
      applyThemeTokensToDocument(buildCustomThemeTokens(next.shell, primary, secondary ?? primary));
    } else if (next.preset) {
      document.documentElement.setAttribute('data-ui-theme-mode', 'preset');
      document.documentElement.setAttribute('data-ui-preset', next.preset);
      clearCustomThemeTokensFromDocument();
    }
    document.documentElement.setAttribute('data-ui-shell', next.shell);
  };

  const selectPreset = (id: PresetThemeId) => {
    const shell = UI_PRESET_OPTIONS.find((p) => p.id === id)?.shell ?? selection.shell;
    const next: ThemeSelection = { mode: 'preset', preset: id, shell };
    updateSelection(next);
    applyLocally(next);
    if (!deferSave) void persist(next);
  };

  const selectCustomColor = (hex: string) => {
    setCustomPrimary(hex);
    setCustomSecondary(hex);
    const next: ThemeSelection = {
      mode: 'custom',
      shell: selection.shell,
      primaryColor: hex,
      secondaryColor: hex,
    };
    updateSelection(next);
    applyLocally(next, hex, hex);
    if (!deferSave) void persist(next, hex, hex);
  };

  const setShell = (shell: UiShell) => {
    const next: ThemeSelection = { ...selection, shell };
    updateSelection(next);
    applyLocally(next, customPrimary, customSecondary);
    if (!deferSave) void persist(next, customPrimary, customSecondary);
  };

  const persist = async (
    next: ThemeSelection,
    primary = customPrimary,
    secondary = customSecondary
  ) => {
    setPending(true);
    try {
      const payload =
        next.mode === 'custom'
          ? { ...next, primaryColor: primary, secondaryColor: secondary }
          : next;
      await saveUserTheme(supabaseClient, userId, payload);
      try {
        localStorage.setItem(
          THEME_STORAGE_KEY,
          next.mode === 'custom' ? 'custom' : (next.preset ?? DEFAULT_UI_PRESET)
        );
      } catch {
        /* ignore */
      }
      await onApplied?.();
      if (!deferSave) showToast('Theme updated', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not save theme', 'error');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={`space-y-5 ${className}`}>
      <div className="flex gap-2">
        {(['dark', 'light'] as const).map((shell) => (
          <button
            key={shell}
            type="button"
            disabled={pending}
            onClick={() => setShell(shell)}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border transition-colors ${
              selection.shell === shell
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground'
            }`}
          >
            {shell === 'dark' ? 'Dark shell' : 'Light shell'}
          </button>
        ))}
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide mb-2">Presets</p>
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Theme presets">
          {UI_PRESET_OPTIONS.map((t) => {
            const selected = selection.mode === 'preset' && selection.preset === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={t.label}
                title={`${t.label} — ${t.hint}`}
                disabled={pending}
                onClick={() => selectPreset(t.id)}
                className={`relative h-11 w-11 shrink-0 rounded-full border-2 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  selected ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-border hover:border-muted-foreground/50'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${t.preview.shell} 50%, ${t.preview.primary} 50%)`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide mb-2">Custom accent</p>
        <div className="grid grid-cols-8 gap-2">
          {CURATED_ACCENT_COLORS.map((hex) => {
            const selected = selection.mode === 'custom' && normalizeHex(customPrimary) === hex;
            return (
              <button
                key={hex}
                type="button"
                disabled={pending}
                aria-label={`Accent ${hex}`}
                onClick={() => selectCustomColor(hex)}
                className={`h-9 w-9 rounded-full border-2 transition-transform ${
                  selected ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: hex }}
              />
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <label className="text-[11px] text-muted-foreground">
            Primary
            <input
              type="color"
              value={normalizeHex(customPrimary) ?? '#f97316'}
              onChange={(e) => selectCustomColor(e.target.value)}
              className="mt-1 w-full h-10 rounded-lg border border-border bg-card cursor-pointer"
            />
          </label>
          <label className="text-[11px] text-muted-foreground">
            Secondary
            <input
              type="color"
              value={normalizeHex(customSecondary) ?? '#fb923c'}
              onChange={(e) => {
                const v = e.target.value;
                setCustomSecondary(v);
                const next: ThemeSelection = {
                  mode: 'custom',
                  shell: selection.shell,
                  primaryColor: customPrimary,
                  secondaryColor: v,
                };
                updateSelection(next);
                applyLocally(next, customPrimary, v);
                if (!deferSave) void persist(next, customPrimary, v);
              }}
              className="mt-1 w-full h-10 rounded-lg border border-border bg-card cursor-pointer"
            />
          </label>
        </div>
      </div>

      {showPreview && previewTokens && (
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{
            background: previewTokens['--card'],
            borderColor: previewTokens['--border'],
            color: previewTokens['--foreground'],
          }}
        >
          <p className="text-[12px] font-bold opacity-80">Preview</p>
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-[13px] font-bold"
            style={{
              background: previewTokens['--primary'],
              color: previewTokens['--primary-foreground'],
            }}
          >
            Join run
          </button>
          <p className="text-[12px] opacity-70">Cards and buttons use your accent on this shell.</p>
        </div>
      )}

      {pending && (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Saving theme…
        </div>
      )}
    </div>
  );
}

export { PRESET_THEME_IDS };
