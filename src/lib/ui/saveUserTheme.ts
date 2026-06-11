import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeHex } from '@/lib/ui/themeEngine';
import {
  DEFAULT_UI_PRESET,
  isPresetThemeId,
  normalizeUiPreset,
  presetDefaultShell,
  type PresetThemeId,
  type UiShell,
} from '@/lib/ui/uiPresets';

export type ThemeSelection = {
  mode: 'preset' | 'custom';
  preset?: PresetThemeId;
  shell: UiShell;
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

export function profileToThemeSelection(profile: {
  ui_theme?: string | null;
  ui_shell?: string | null;
  ui_primary_color?: string | null;
  ui_secondary_color?: string | null;
} | null | undefined): ThemeSelection {
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

export function themeSelectionToDbPayload(selection: ThemeSelection): Record<string, unknown> {
  if (selection.mode === 'preset' && selection.preset) {
    return {
      ui_theme: selection.preset,
      ui_shell: selection.shell || presetDefaultShell(selection.preset),
      ui_primary_color: null,
      ui_secondary_color: null,
    };
  }

  const primary = normalizeHex(selection.primaryColor);
  if (!primary) {
    return {
      ui_theme: selection.preset && isPresetThemeId(selection.preset) ? selection.preset : DEFAULT_UI_PRESET,
      ui_shell: selection.shell,
      ui_primary_color: null,
      ui_secondary_color: null,
    };
  }

  return {
    ui_theme: 'custom',
    ui_shell: selection.shell,
    ui_primary_color: primary,
    ui_secondary_color: normalizeHex(selection.secondaryColor) ?? primary,
  };
}

export async function saveUserTheme(
  supabase: SupabaseClient,
  userId: string,
  selection: ThemeSelection
): Promise<void> {
  const payload = themeSelectionToDbPayload(selection);
  const { error } = await supabase.from('users').update(payload).eq('id', userId);
  if (error) throw error;
}
