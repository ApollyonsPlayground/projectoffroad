'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Loader2, MapPin } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { ThemePicker } from '@/components/theme/ThemePicker';
import { validateUsernameInput } from '@/lib/profileDisplay';
import { profileToThemeSelection, saveUserTheme, type ThemeSelection } from '@/lib/ui/saveUserTheme';
import { needsOnboardingWizard } from '@/lib/ui/onboarding';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading, isGuest, supabaseClient, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [themeSelection, setThemeSelection] = useState<ThemeSelection | null>(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setUsername(String(profile.username ?? '').trim());
  }, [profile]);

  useEffect(() => {
    if (step === 2 && profile && !themeSelection) {
      setThemeSelection(profileToThemeSelection(profile));
    }
  }, [step, profile, themeSelection]);

  useEffect(() => {
    if (loading) return;
    if (!user || isGuest) {
      router.replace('/');
      return;
    }
    if (!needsOnboardingWizard(profile)) {
      router.replace('/feed/');
    }
  }, [loading, user, isGuest, profile, router]);

  const validateAndCheckUsername = async (): Promise<boolean> => {
    if (!supabaseClient || !user) return false;
    const check = validateUsernameInput(username);
    if (!check.ok) {
      setUsernameError(check.message);
      return false;
    }
    if (!check.value) {
      setUsernameError('Choose a trail name to continue');
      return false;
    }
    setUsernameError(null);
    setCheckingUsername(true);
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .select('id')
        .eq('username', check.value)
        .neq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setUsernameError('That trail name is already taken');
        return false;
      }
      const { error: updErr } = await supabaseClient
        .from('users')
        .update({ username: check.value })
        .eq('id', user.id);
      if (updErr) {
        if (updErr.code === '23505') {
          setUsernameError('That trail name is already taken');
          return false;
        }
        throw updErr;
      }
      await refreshProfile();
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not save trail name', 'error');
      return false;
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleStep1Continue = async () => {
    const ok = await validateAndCheckUsername();
    if (ok) setStep(2);
  };

  const handleFinish = async () => {
    if (!supabaseClient || !user || !themeSelection) {
      showToast('Pick a theme to continue', 'error');
      return;
    }
    setFinishing(true);
    try {
      await saveUserTheme(supabaseClient, user.id, themeSelection);
      const { error } = await supabaseClient
        .from('users')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      router.replace('/feed/');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not finish setup', 'error');
    } finally {
      setFinishing(false);
    }
  };

  if (loading || !user || !supabaseClient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-app-shell mx-auto w-full flex-1 px-5 py-8 pb-safe-nav flex flex-col">
        <div className="flex items-center gap-2 mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span className={step === 1 ? 'text-primary' : ''}>Trail name</span>
          <ChevronRight size={14} aria-hidden />
          <span className={step === 2 ? 'text-primary' : ''}>Theme</span>
        </div>

        {step === 1 ? (
          <>
            <div className="flex items-center gap-3 mb-2 mt-4">
              <MapPin className="text-primary shrink-0" size={26} aria-hidden />
              <h1 className="text-xl font-bold text-foreground">Choose your trail name</h1>
            </div>
            <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">
              This is how other riders see you on runs and the feed — like{' '}
              <span className="text-foreground font-medium">@my_z71_adventures</span>.
            </p>
            <label className="block">
              <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">@username</span>
              <div className="mt-2 flex items-center rounded-xl border border-border bg-card overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <span className="pl-4 text-muted-foreground font-medium">@</span>
                <input
                  type="text"
                  value={username.replace(/^@+/, '')}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError(null);
                  }}
                  autoComplete="username"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="flex-1 bg-transparent py-3.5 pr-4 text-foreground outline-none"
                  placeholder="trail_name"
                />
              </div>
              {usernameError ? (
                <p className="mt-2 text-[13px] text-destructive">{usernameError}</p>
              ) : (
                <p className="mt-2 text-[12px] text-muted-foreground">3–24 characters — letters, numbers, underscores</p>
              )}
            </label>
            <div className="mt-auto pt-8">
              <button
                type="button"
                onClick={() => void handleStep1Continue()}
                disabled={checkingUsername}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-[15px] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {checkingUsername ? <Loader2 size={18} className="animate-spin" /> : null}
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-foreground mt-4 mb-2">Pick the theme of your adventure</h1>
            <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">
              Presets and custom accents — change anytime in Settings.
            </p>
            <ThemePicker
              supabaseClient={supabaseClient}
              userId={user.id}
              profile={profile}
              deferSave
              onSelectionChange={setThemeSelection}
              showPreview
              className="flex-1"
            />
            <div className="mt-auto pt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={finishing}
                className="px-5 py-3.5 rounded-xl border border-border text-foreground font-bold text-[15px] disabled:opacity-60"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleFinish()}
                disabled={finishing || !themeSelection}
                className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-[15px] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {finishing ? <Loader2 size={18} className="animate-spin" /> : null}
                Start exploring
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
