'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ThemePicker } from '@/components/theme/ThemePicker';
import { needsThemePrompt } from '@/lib/ui/onboarding';

/**
 * One-time full-screen theme picker for existing users after the theme revamp.
 */
export function ThemePromptModal() {
  const { user, profile, loading, isGuest, supabaseClient, refreshProfile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shouldShow =
    mounted &&
    !loading &&
    !!user &&
    !isGuest &&
    !!supabaseClient &&
    needsThemePrompt(profile);

  useEffect(() => {
    if (!shouldShow) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [shouldShow]);

  const dismiss = async () => {
    if (!supabaseClient || !user || dismissing) return;
    setDismissing(true);
    try {
      const { error } = await supabaseClient
        .from('users')
        .update({ theme_prompt_seen_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
    } catch (e) {
      console.warn('[ThemePromptModal] dismiss:', e);
    } finally {
      setDismissing(false);
    }
  };

  if (!shouldShow) return null;

  const ui = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-prompt-title"
      className="fixed inset-0 z-[19998] flex flex-col bg-background overflow-y-auto"
    >
      <div className="flex-1 max-w-app-shell mx-auto w-full px-5 py-8 pb-safe-nav flex flex-col">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="text-primary shrink-0" size={28} aria-hidden />
          <h1 id="theme-prompt-title" className="text-xl font-bold text-foreground">
            Pick the theme of your adventure
          </h1>
        </div>
        <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">
          We refreshed our color presets — choose a look that fits your trail style. You can change this anytime in
          Settings.
        </p>

        <ThemePicker
          supabaseClient={supabaseClient}
          userId={user.id}
          profile={profile}
          onApplied={refreshProfile}
          showPreview
          className="flex-1"
        />

        <div className="sticky bottom-0 pt-6 pb-2 bg-gradient-to-t from-background via-background to-transparent">
          <button
            type="button"
            onClick={() => void dismiss()}
            disabled={dismissing}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-[15px] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {dismissing ? <Loader2 size={18} className="animate-spin" /> : null}
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
