'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { THEME_STORAGE_KEY } from '@/components/ThemeSync';
import { useToast } from '@/components/Toast';
import { UI_PRESET_OPTIONS, normalizeUiPreset, type UiPresetId } from '@/lib/ui/uiPresets';

type Props = {
  supabaseClient: SupabaseClient;
  userId: string;
  profileUiTheme: string | null | undefined;
  onApplied: () => Promise<void>;
  /** Optional class on the outer flex row */
  className?: string;
};

/**
 * Compact theme picker: each preset is a circle split diagonally (shell / accent).
 */
export function ProfileThemeSwatches({
  supabaseClient,
  userId,
  profileUiTheme,
  onApplied,
  className = '',
}: Props) {
  const { showToast } = useToast();
  const current = normalizeUiPreset(profileUiTheme);
  const [pending, setPending] = useState<UiPresetId | null>(null);

  const apply = async (id: UiPresetId) => {
    if (id === current) return;
    setPending(id);
    try {
      const { error } = await supabaseClient.from('users').update({ ui_theme: id }).eq('id', userId);
      if (error) throw error;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, id);
      } catch {
        /* ignore */
      }
      document.documentElement.setAttribute('data-ui-preset', id);
      await onApplied();
      showToast('Theme updated', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not save theme', 'error');
    } finally {
      setPending(null);
    }
  };

  return (
    <div
      className={`flex items-center justify-end gap-2.5 flex-wrap ${className}`}
      role="radiogroup"
      aria-label="App color theme"
    >
      {UI_PRESET_OPTIONS.map((t) => {
        const selected = current === t.id;
        const loading = pending === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t.label}
            title={`${t.label} — ${t.hint}`}
            disabled={pending !== null}
            onClick={() => void apply(t.id)}
            className={`relative h-10 w-10 shrink-0 rounded-full border-2 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 ${
              selected
                ? 'border-primary ring-2 ring-primary/35 scale-[1.06] shadow-md shadow-primary/20'
                : 'border-border hover:border-muted-foreground/50 hover:scale-105'
            }`}
            style={{
              background: `linear-gradient(135deg, ${t.preview.bg} 50%, ${t.preview.accent} 50%)`,
            }}
          >
            {loading ? (
              <span className="absolute inset-0 rounded-full bg-background/70 flex items-center justify-center backdrop-blur-[1px]">
                <Loader2 className="h-4 w-4 animate-spin text-foreground" aria-hidden />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
