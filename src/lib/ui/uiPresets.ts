/** Stored in `users.ui_theme` — full appearance packages (shell + accent). */
export const UI_PRESET_IDS = [
  'midnight-orange',
  'paper-crimson',
  'navy-sage',
  'void-teal-violet',
] as const;

export type UiPresetId = (typeof UI_PRESET_IDS)[number];

export const DEFAULT_UI_PRESET: UiPresetId = 'midnight-orange';

const VALID = new Set<string>(UI_PRESET_IDS);

/** Legacy `data-theme` / DB values before preset slugs. */
const LEGACY_THEME_TO_PRESET: Record<string, UiPresetId> = {
  dark: 'midnight-orange',
  light: 'paper-crimson',
  blue: 'navy-sage',
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

export const UI_PRESET_OPTIONS: {
  id: UiPresetId;
  label: string;
  hint: string;
  /** Mini swatch on settings (not CSS vars — shows intended package). */
  preview: { bg: string; accent: string };
}[] = [
  {
    id: 'midnight-orange',
    label: 'Midnight & orange',
    hint: 'Black shell — default brand look',
    preview: { bg: '#000000', accent: '#f97316' },
  },
  {
    id: 'paper-crimson',
    label: 'Paper & crimson',
    hint: 'Light UI with red accents',
    preview: { bg: '#f4f4f5', accent: '#dc2626' },
  },
  {
    id: 'navy-sage',
    label: 'Navy & sage',
    hint: 'Deep blue-green with mint accent',
    preview: { bg: '#071a18', accent: '#2dd4bf' },
  },
  {
    id: 'void-teal-violet',
    label: 'Void, teal & violet',
    hint: 'Dark UI — teal + purple highlights',
    preview: { bg: '#0c0a12', accent: '#14b8a6' },
  },
];
