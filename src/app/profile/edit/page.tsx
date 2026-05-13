'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { validateUsernameInput } from '@/lib/profileDisplay';
import { THEME_STORAGE_KEY, type UiTheme } from '@/components/ThemeSync';

const LEVELS = ['Beginner', 'Intermediate', 'Expert'] as const;

const THEMES: { id: UiTheme; label: string; hint: string }[] = [
  { id: 'dark', label: 'Dark', hint: 'Black shell — original look' },
  { id: 'light', label: 'Light', hint: 'White / paper UI' },
  { id: 'blue', label: 'Blue', hint: 'Navy blue shell' },
];

export default function EditProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, supabaseClient, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<string>('Beginner');
  const [uiTheme, setUiTheme] = useState<UiTheme>('dark');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(String(profile.name ?? '').trim());
    setUsername(String(profile.username ?? '').trim());
    setBio(String(profile.bio ?? ''));
    setLocation(String(profile.location ?? ''));
    const lvl = String(profile.experience_level ?? 'Beginner');
    setExperienceLevel(LEVELS.includes(lvl as (typeof LEVELS)[number]) ? lvl : 'Beginner');
    const th = String(profile.ui_theme ?? 'dark');
    setUiTheme(th === 'light' || th === 'blue' || th === 'dark' ? (th as UiTheme) : 'dark');
  }, [profile]);

  const handleSave = async () => {
    if (!user || !supabaseClient) return;
    const n = name.trim();
    if (!n) {
      showToast('Display name is required', 'error');
      return;
    }
    const unameCheck = validateUsernameInput(username);
    if (!unameCheck.ok) {
      showToast(unameCheck.message, 'error');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabaseClient
        .from('users')
        .update({
          name: n,
          username: unameCheck.value,
          bio: bio.trim() || null,
          location: location.trim() || null,
          experience_level: experienceLevel,
          ui_theme: uiTheme,
        })
        .eq('id', user.id);
      if (error) {
        if (error.code === '23505') {
          showToast('That username is already taken', 'error');
          setSaving(false);
          return;
        }
        const msg = String(error.message ?? '');
        if (msg.toLowerCase().includes('once every 24 hours')) {
          showToast('You can change your name/username once every 24 hours.', 'error');
          setSaving(false);
          return;
        }
        throw error;
      }
      try {
        localStorage.setItem(THEME_STORAGE_KEY, uiTheme);
      } catch {
        /* ignore */
      }
      document.documentElement.setAttribute('data-theme', uiTheme);
      await refreshProfile();
      showToast('Profile updated', 'success');
      router.push('/profile');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    );
  }

  if (!user || !supabaseClient) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-muted-foreground text-center">Sign in to edit your profile.</p>
        <Link href="/login" className="text-orange-500 font-bold">
          Sign in
        </Link>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-app-shell mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/profile" className="p-2 -ml-2 text-muted-foreground hover:text-foreground" aria-label="Back">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-[17px] font-bold text-foreground">Edit profile</h1>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500 text-black text-[13px] font-bold disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </header>

      <main className="max-w-app-shell mx-auto px-4 py-6 space-y-5">
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Appearance
          </label>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setUiTheme(t.id)}
                className={`rounded-xl border px-2 py-3 text-left transition ${
                  uiTheme === t.id
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border bg-card hover:border-muted-foreground/40'
                }`}
              >
                <span className="block text-[13px] font-bold text-foreground">{t.label}</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5 leading-snug">{t.hint}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            Applies across the app (including clubs). Stored on your profile.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Display name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-[15px] text-foreground outline-none focus:border-primary/50"
            autoComplete="name"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
            Shown when your name isn&apos;t hidden — separate from Google; turn off sync in Settings if needed.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Username
          </label>
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-3 py-2.5 focus-within:border-primary/50">
            <span className="text-muted-foreground text-[15px] select-none">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="trail_name"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-w-0 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
            Optional · 3–24 characters · letters, numbers, underscores · shown as @handle when you hide your display name
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Tell the community about your rig and favorite trails…"
            className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 resize-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Location
          </label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City or region"
            className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Experience level
          </label>
          <select
            value={experienceLevel}
            onChange={(e) => setExperienceLevel(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-[15px] text-foreground outline-none focus:border-primary/50"
          >
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>

        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Avatar and garage — from your Rig Portfolio. Verified badge and role are managed by admins.
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
