/** Stored in `users.ui_theme` — full appearance packages (shell + accent). */
export const UI_PRESET_IDS = [
  'midnight-orange',
  'paper-crimson',
  'navy-sage',
  'void-violet',
  'desert-amber',
  'slate-cyan',
  'custom',
] as const;

export type UiPresetId = (typeof UI_PRESET_IDS)[number];

export const PRESET_THEME_IDS = [
  'midnight-orange',
  'paper-crimson',
  'navy-sage',
  'void-violet',
  'desert-amber',
  'slate-cyan',
] as const;

export type PresetThemeId = (typeof PRESET_THEME_IDS)[number];

export const DEFAULT_UI_PRESET: PresetThemeId = 'midnight-orange';

const VALID = new Set<string>(UI_PRESET_IDS);
const VALID_PRESETS = new Set<string>(PRESET_THEME_IDS);

/** Legacy `data-theme` / DB values before preset slugs. */
const LEGACY_THEME_TO_PRESET: Record<string, PresetThemeId> = {
  dark: 'midnight-orange',
  light: 'paper-crimson',
  blue: 'navy-sage',
  'void-teal-violet': 'void-violet',
};

export function normalizeUiPreset(raw: string | null | undefined): UiPresetId {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (VALID.has(s)) return s as UiPresetId;
  const mapped = LEGACY_THEME_TO_PRESET[s];
  if (mapped) return mapped;
  return DEFAULT_UI_PRESET;
}

export function isPresetThemeId(id: string): id is PresetThemeId {
  return VALID_PRESETS.has(id);
}

export type UiShell = 'dark' | 'light';

export const UI_PRESET_OPTIONS: {
  id: PresetThemeId;
  label: string;
  hint: string;
  shell: UiShell;
  /** Mini swatch: shell + primary (what buttons look like). */
  preview: { shell: string; primary: string };
}[] = [
  {
    id: 'midnight-orange',
    label: 'Midnight & orange',
    hint: 'Black shell — default brand look',
    shell: 'dark',
    preview: { shell: '#000000', primary: '#f97316' },
  },
  {
    id: 'paper-crimson',
    label: 'Paper & crimson',
    hint: 'Light UI with red accents',
    shell: 'light',
    preview: { shell: '#f4f4f5', primary: '#dc2626' },
  },
  {
    id: 'navy-sage',
    label: 'Navy & sage',
    hint: 'Deep ocean blue with mint accents',
    shell: 'dark',
    preview: { shell: '#0a1628', primary: '#5eead4' },
  },
  {
    id: 'void-violet',
    label: 'Void & violet',
    hint: 'Blue-black shell with purple CTAs',
    shell: 'dark',
    preview: { shell: '#0c0a14', primary: '#a78bfa' },
  },
  {
    id: 'desert-amber',
    label: 'Desert & amber',
    hint: 'Warm charcoal with golden trail accents',
    shell: 'dark',
    preview: { shell: '#1a1410', primary: '#f59e0b' },
  },
  {
    id: 'slate-cyan',
    label: 'Slate & cyan',
    hint: 'Cool gray shell with bright cyan highlights',
    shell: 'dark',
    preview: { shell: '#111827', primary: '#22d3ee' },
  },
];

export function presetDefaultShell(id: PresetThemeId): UiShell {
  return UI_PRESET_OPTIONS.find((p) => p.id === id)?.shell ?? 'dark';
}
