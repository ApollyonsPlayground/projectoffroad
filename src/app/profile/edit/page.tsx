'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { validateUsernameInput } from '@/lib/profileDisplay';

const LEVELS = ['Beginner', 'Intermediate', 'Expert'] as const;

export default function EditProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, supabaseClient, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<string>('Beginner');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(String(profile.name ?? '').trim());
    setUsername(String(profile.username ?? '').trim());
    setBio(String(profile.bio ?? ''));
    setLocation(String(profile.location ?? ''));
    const lvl = String(profile.experience_level ?? 'Beginner');
    setExperienceLevel(LEVELS.includes(lvl as (typeof LEVELS)[number]) ? lvl : 'Beginner');
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
        })
        .eq('id', user.id);
      if (error) {
        if (error.code === '23505') {
          showToast('That username is already taken', 'error');
          setSaving(false);
          return;
        }
        throw error;
      }
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-zinc-500" size={28} />
      </div>
    );
  }

  if (!user || !supabaseClient) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-zinc-400 text-center">Sign in to edit your profile.</p>
        <Link href="/login" className="text-orange-500 font-bold">
          Sign in
        </Link>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-28">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-zinc-900">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/profile" className="p-2 -ml-2 text-zinc-400 hover:text-white" aria-label="Back">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-[17px] font-bold text-white">Edit profile</h1>
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

      <main className="max-w-md mx-auto px-4 py-6 space-y-5">
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Display name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-[15px] text-white outline-none focus:border-orange-500/50"
            autoComplete="name"
          />
          <p className="text-[11px] text-zinc-600 mt-1.5 leading-relaxed">
            Shown when your name isn&apos;t hidden — separate from Google; turn off sync in Settings if needed.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Username
          </label>
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 focus-within:border-orange-500/50">
            <span className="text-zinc-500 text-[15px] select-none">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="trail_name"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-w-0 bg-transparent text-[15px] text-white outline-none placeholder:text-zinc-600"
            />
          </div>
          <p className="text-[11px] text-zinc-600 mt-1.5 leading-relaxed">
            Optional · 3–24 characters · letters, numbers, underscores · shown as @handle when you hide your display name
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Tell the community about your rig and favorite trails…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-[15px] text-white placeholder:text-zinc-600 outline-none focus:border-orange-500/50 resize-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Location
          </label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City or region"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-[15px] text-white placeholder:text-zinc-600 outline-none focus:border-orange-500/50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Experience level
          </label>
          <select
            value={experienceLevel}
            onChange={(e) => setExperienceLevel(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-[15px] text-white outline-none focus:border-orange-500/50"
          >
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>

        <p className="text-[12px] text-zinc-600 leading-relaxed">
          Avatar and garage — from your Rig Portfolio. Verified badge and role are managed by admins.
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
