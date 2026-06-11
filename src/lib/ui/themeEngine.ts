/** Runtime theme token generation for custom palettes. */

export type UiShell = 'dark' | 'light';

export type ThemeTokens = Record<string, string>;

const HEX_RE = /^#?([0-9a-fA-F]{6})$/;

export const CURATED_ACCENT_COLORS = [
  '#f97316',
  '#dc2626',
  '#e11d48',
  '#db2777',
  '#a855f7',
  '#7c3aed',
  '#6366f1',
  '#2563eb',
  '#0891b2',
  '#14b8a6',
  '#22c55e',
  '#84cc16',
  '#eab308',
  '#f59e0b',
  '#78716c',
  '#e4e4e7',
] as const;

export function normalizeHex(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  const m = s.match(HEX_RE);
  if (!m) return null;
  return `#${m[1].toLowerCase()}`;
}

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  const h = normalizeHex(hex)!.slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = ((h % 360) + 360) % 360;
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = hue / 360;
  const t = (n: number) => {
    let x = hk + n;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return { r: t(0) * 255, g: t(1 / 3) * 255, b: t(2 / 3) * 255 };
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function pickForeground(bg: Rgb): string {
  const white: Rgb = { r: 250, g: 250, b: 250 };
  const black: Rgb = { r: 12, g: 12, b: 14 };
  return contrastRatio(bg, white) >= contrastRatio(bg, black) ? '#fafafa' : '#0c0c0e';
}

export function buildCustomThemeTokens(
  shell: UiShell,
  primaryRaw: string,
  secondaryRaw?: string | null
): ThemeTokens {
  const primary = normalizeHex(primaryRaw) ?? '#f97316';
  const secondary = normalizeHex(secondaryRaw) ?? primary;

  const primaryRgb = hexToRgb(primary);
  const secondaryRgb = hexToRgb(secondary);
  const primaryHsl = rgbToHsl(primaryRgb);

  const isDark = shell === 'dark';
  const bgRgb = isDark
    ? hslToRgb(primaryHsl.h, Math.min(0.35, primaryHsl.s * 0.15), 0.04)
    : hslToRgb(primaryHsl.h, Math.min(0.12, primaryHsl.s * 0.08), 0.96);
  const cardRgb = isDark
    ? hslToRgb(primaryHsl.h, Math.min(0.28, primaryHsl.s * 0.12), 0.1)
    : hslToRgb(primaryHsl.h, Math.min(0.08, primaryHsl.s * 0.05), 1);
  const mutedRgb = isDark
    ? hslToRgb(primaryHsl.h, Math.min(0.22, primaryHsl.s * 0.1), 0.16)
    : hslToRgb(primaryHsl.h, Math.min(0.06, primaryHsl.s * 0.04), 0.9);
  const borderRgb = isDark
    ? hslToRgb(primaryHsl.h, Math.min(0.2, primaryHsl.s * 0.08), 0.26)
    : hslToRgb(primaryHsl.h, Math.min(0.05, primaryHsl.s * 0.03), 0.82);

  const background = rgbToHex(bgRgb);
  const foreground = pickForeground(bgRgb);
  const card = rgbToHex(cardRgb);
  const muted = rgbToHex(mutedRgb);
  const border = rgbToHex(borderRgb);
  const primaryFg = pickForeground(primaryRgb);
  const secondaryColor = rgbToHex(secondaryRgb);
  const secondaryFg = pickForeground(secondaryRgb);

  const glow = primaryRgb;

  return {
    '--theme-color-meta': background,
    '--glow-rgb': `${glow.r}, ${glow.g}, ${glow.b}`,
    '--background': background,
    '--foreground': foreground,
    '--card': card,
    '--card-foreground': foreground,
    '--popover': card,
    '--popover-foreground': foreground,
    '--primary': primary,
    '--primary-foreground': primaryFg,
    '--secondary': muted,
    '--secondary-foreground': foreground,
    '--muted': muted,
    '--muted-foreground': isDark ? '#a1a1aa' : '#52525b',
    '--accent': secondaryColor,
    '--accent-foreground': secondaryFg,
    '--destructive': '#ef4444',
    '--destructive-foreground': '#fafafa',
    '--border': border,
    '--input': muted,
    '--ring': primary,
    '--glass-bg': isDark
      ? `rgba(${cardRgb.r}, ${cardRgb.g}, ${cardRgb.b}, 0.82)`
      : `rgba(255, 255, 255, 0.92)`,
  };
}

export const THEME_CSS_VAR_KEYS = [
  '--theme-color-meta',
  '--glow-rgb',
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--destructive',
  '--destructive-foreground',
  '--border',
  '--input',
  '--ring',
  '--glass-bg',
] as const;

export function applyThemeTokensToDocument(tokens: ThemeTokens): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const key of THEME_CSS_VAR_KEYS) {
    if (tokens[key]) root.style.setProperty(key, tokens[key]);
  }
}

export function clearCustomThemeTokensFromDocument(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const key of THEME_CSS_VAR_KEYS) {
    root.style.removeProperty(key);
  }
}

export type UserThemeProfile = {
  ui_theme?: string | null;
  ui_shell?: string | null;
  ui_primary_color?: string | null;
  ui_secondary_color?: string | null;
};

export function resolveUserThemeApplication(profile: UserThemeProfile | null | undefined): {
  mode: 'preset' | 'custom';
  preset: string;
  shell: UiShell;
  tokens?: ThemeTokens;
} {
  const theme = String(profile?.ui_theme ?? 'midnight-orange').trim().toLowerCase();
  const shell: UiShell = profile?.ui_shell === 'light' ? 'light' : 'dark';
  const primary = normalizeHex(profile?.ui_primary_color);
  const secondary = normalizeHex(profile?.ui_secondary_color);

  if (theme === 'custom' && primary) {
    return {
      mode: 'custom',
      preset: 'midnight-orange',
      shell,
      tokens: buildCustomThemeTokens(shell, primary, secondary),
    };
  }

  return { mode: 'preset', preset: theme, shell };
}
