'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Ban,
  Bell,
  HelpCircle,
  Info,
  LogOut,
  MessageSquare,
  Shield,
  User,
  Loader2,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { SITE_SUPPORT_EMAIL } from '@/lib/siteContact';
import { resolvePublicDisplayName } from '@/lib/profileDisplay';

type DmAllow = 'everyone' | 'nobody';

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, signOut, supabaseClient, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [notifyRuns, setNotifyRuns] = useState(true);
  const [notifyClubs, setNotifyClubs] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(false);
  const [dmAllow, setDmAllow] = useState<DmAllow>('everyone');
  const [blockedRows, setBlockedRows] = useState<{ blocked_id: string; label: string }[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [hideDisplayName, setHideDisplayName] = useState(false);
  const [syncGoogleName, setSyncGoogleName] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setNotifyRuns(profile.notify_runs !== false);
    setNotifyClubs(profile.notify_clubs !== false);
    setNotifyMessages(profile.notify_messages === true);
    const dm = String(profile.dm_allow_from ?? 'everyone');
    setDmAllow(dm === 'nobody' ? 'nobody' : 'everyone');
    setHideDisplayName(profile.hide_display_name === true);
    setSyncGoogleName(profile.sync_display_name_from_google === true);
  }, [profile]);

  const loadBlocks = useCallback(async () => {
    if (!supabaseClient || !user) return;
    setLoadingBlocks(true);
    try {
      const { data: rows, error } = await supabaseClient
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);
      if (error || !rows?.length) {
        setBlockedRows([]);
        return;
      }
      const ids = [...new Set(rows.map((r) => r.blocked_id))];
      const { data: profiles } = await supabaseClient
        .from('users')
        .select('id, name, username, hide_display_name, email')
        .in('id', ids);
      const labelById = new Map(
        (profiles ?? []).map((u: Record<string, unknown>) => [
          u.id as string,
          resolvePublicDisplayName({
            id: u.id as string,
            name: u.name as string | null,
            username: u.username as string | null,
            hide_display_name: u.hide_display_name as boolean | null,
            email: u.email as string | null,
          }),
        ])
      );
      setBlockedRows(ids.map((id) => ({ blocked_id: id, label: labelById.get(id) ?? 'Member' })));
    } catch {
      setBlockedRows([]);
    } finally {
      setLoadingBlocks(false);
    }
  }, [supabaseClient, user]);

  useEffect(() => {
    if (user && supabaseClient) void loadBlocks();
  }, [user, supabaseClient, loadBlocks]);

  const persistPrefs = async (patch: Record<string, unknown>) => {
    if (!supabaseClient || !user) return;
    try {
      const { error } = await supabaseClient.from('users').update(patch).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not save settings', 'error');
    }
  };

  const toggleRuns = async (v: boolean) => {
    setNotifyRuns(v);
    await persistPrefs({ notify_runs: v });
  };

  const toggleClubs = async (v: boolean) => {
    setNotifyClubs(v);
    await persistPrefs({ notify_clubs: v });
  };

  const toggleMessages = async (v: boolean) => {
    setNotifyMessages(v);
    await persistPrefs({ notify_messages: v });
  };

  const changeDm = async (v: DmAllow) => {
    setDmAllow(v);
    await persistPrefs({ dm_allow_from: v });
  };

  const toggleHideDisplayName = async (v: boolean) => {
    setHideDisplayName(v);
    await persistPrefs({ hide_display_name: v });
  };

  const toggleSyncGoogleName = async (v: boolean) => {
    setSyncGoogleName(v);
    await persistPrefs({ sync_display_name_from_google: v });
  };

  const unblock = async (blockedId: string) => {
    if (!supabaseClient || !user) return;
    try {
      const { error } = await supabaseClient
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedId);
      if (error) throw error;
      showToast('Unblocked', 'success');
      await loadBlocks();
    } catch {
      showToast('Could not unblock', 'error');
    }
  };

  const handleLogout = async () => {
    await signOut();
    showToast('Signed out', 'success');
    router.push('/');
  };

  const googleLinked = Boolean(user?.identities?.some((i) => i.provider === 'google'));

  return (
    <div className="min-h-screen bg-[#050705] pb-24">
      <div className="sticky top-0 z-50 bg-[#050705] border-b-2 border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-4 max-w-xl mx-auto">
          <Link href={user ? '/profile' : '/'} className="text-neutral-400 hover:text-white" aria-label="Back">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-lg font-bold text-white uppercase tracking-wide">Settings</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Account */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <User className="text-muted-gold" size={20} />
            <h2 className="text-white font-bold uppercase tracking-wide">Account</h2>
          </div>
          {!user ? (
            <p className="text-neutral-500 text-sm">Sign in to manage your account.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-neutral-500">Email</span>
                <span className="text-neutral-200 text-right truncate">{user.email ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-3 items-center">
                <span className="text-neutral-500">Sign-in</span>
                <span className="text-neutral-200">
                  {googleLinked ? 'Google' : 'Connected'}
                </span>
              </div>
              <Link
                href="/profile/edit"
                className="flex items-center justify-between text-orange-400 hover:text-orange-300 py-2 border-t border-neutral-800 mt-2 pt-3"
              >
                <span>Edit profile</span>
                <span className="text-neutral-600">→</span>
              </Link>
              <Link
                href="/guidelines"
                className="flex items-center justify-between text-neutral-400 hover:text-white py-2"
              >
                <span>Community guidelines</span>
                <span className="text-neutral-600">→</span>
              </Link>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="text-muted-gold" size={20} />
            <h2 className="text-white font-bold uppercase tracking-wide">Notifications</h2>
          </div>
          <p className="text-neutral-600 text-[11px] uppercase tracking-wider mb-3">
            Saved to your account · push delivery coming later
          </p>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-neutral-400">New runs in my area</span>
              <input
                type="checkbox"
                checked={notifyRuns}
                onChange={(e) => void toggleRuns(e.target.checked)}
                className="w-5 h-5 accent-muted-gold"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-neutral-400">Club updates</span>
              <input
                type="checkbox"
                checked={notifyClubs}
                onChange={(e) => void toggleClubs(e.target.checked)}
                className="w-5 h-5 accent-muted-gold"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-neutral-400">Direct messages</span>
              <input
                type="checkbox"
                checked={notifyMessages}
                onChange={(e) => void toggleMessages(e.target.checked)}
                className="w-5 h-5 accent-muted-gold"
              />
            </label>
          </div>
        </div>

        {/* Identity */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <User className="text-muted-gold" size={20} />
            <h2 className="text-white font-bold uppercase tracking-wide">Profile & identity</h2>
          </div>
          {!user ? (
            <p className="text-neutral-500 text-sm">Sign in to manage how others see your name.</p>
          ) : (
            <div className="space-y-4">
              <p className="text-neutral-600 text-[12px] leading-relaxed">
                Set your display name and optional @username under{' '}
                <Link href="/profile/edit" className="text-orange-400 hover:text-orange-300">
                  Edit profile
                </Link>
                . New posts and comments use your current public label (not stale Google metadata).
              </p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideDisplayName}
                  onChange={(e) => void toggleHideDisplayName(e.target.checked)}
                  className="w-5 h-5 mt-0.5 accent-muted-gold flex-shrink-0"
                />
                <span>
                  <span className="text-neutral-300 text-sm font-semibold block">Hide display name</span>
                  <span className="text-neutral-600 text-[12px] leading-relaxed">
                    Others see your @username if set, otherwise a neutral label. Your profile details stay separate from Google after sign-in.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncGoogleName}
                  onChange={(e) => void toggleSyncGoogleName(e.target.checked)}
                  className="w-5 h-5 mt-0.5 accent-muted-gold flex-shrink-0"
                />
                <span>
                  <span className="text-neutral-300 text-sm font-semibold block">Keep display name in sync with Google</span>
                  <span className="text-neutral-600 text-[12px] leading-relaxed">
                    When enabled, your saved display name updates whenever you sign in with Google. Turn off to keep a custom name.
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Messages / privacy */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="text-muted-gold" size={20} />
            <h2 className="text-white font-bold uppercase tracking-wide">Messages</h2>
          </div>
          <p className="text-neutral-500 text-sm mb-3">Who can start a DM with you?</p>
          <select
            value={dmAllow}
            onChange={(e) => void changeDm(e.target.value as DmAllow)}
            disabled={!user}
            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2.5 text-neutral-200 text-sm outline-none focus:border-muted-gold"
          >
            <option value="everyone">Everyone signed in</option>
            <option value="nobody">No one (disable DMs)</option>
          </select>
        </div>

        {/* Blocked */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <Ban className="text-muted-gold" size={20} />
            <h2 className="text-white font-bold uppercase tracking-wide">Blocked accounts</h2>
          </div>
          {!user ? (
            <p className="text-neutral-500 text-sm">Sign in to manage blocked accounts.</p>
          ) : loadingBlocks ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-neutral-500" />
            </div>
          ) : blockedRows.length === 0 ? (
            <p className="text-neutral-600 text-sm">You haven&apos;t blocked anyone.</p>
          ) : (
            <ul className="space-y-2">
              {blockedRows.map((row) => (
                <li
                  key={row.blocked_id}
                  className="flex items-center justify-between gap-2 py-2 border-b border-neutral-800 last:border-0"
                >
                  <Link href={`/profile/${row.blocked_id}`} className="text-neutral-300 text-sm truncate hover:text-white">
                    {row.label}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void unblock(row.blocked_id)}
                    className="text-[11px] font-bold uppercase text-orange-400 hover:text-orange-300 flex-shrink-0"
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Privacy */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-muted-gold" size={20} />
            <h2 className="text-white font-bold uppercase tracking-wide">Privacy</h2>
          </div>
          <div className="space-y-3">
            <Link href="/privacy" className="flex items-center justify-between text-neutral-400 hover:text-white py-2">
              <span>Privacy Policy</span>
              <span className="text-neutral-600">→</span>
            </Link>
            <Link href="/terms" className="flex items-center justify-between text-neutral-400 hover:text-white py-2">
              <span>Terms of Service</span>
              <span className="text-neutral-600">→</span>
            </Link>
          </div>
        </div>

        {/* Support */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="text-muted-gold" size={20} />
            <h2 className="text-white font-bold uppercase tracking-wide">Support</h2>
          </div>
          <div className="space-y-3">
            <Link href="/guides" className="flex items-center justify-between text-neutral-400 hover:text-white py-2">
              <span>Beginner&apos;s Guide</span>
              <span className="text-neutral-600">→</span>
            </Link>
            <a
              href={`mailto:${SITE_SUPPORT_EMAIL}`}
              className="flex items-center justify-between text-neutral-400 hover:text-white py-2"
            >
              <span>Contact Us</span>
              <span className="text-neutral-600">→</span>
            </a>
          </div>
        </div>

        {/* About */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <Info className="text-muted-gold" size={20} />
            <h2 className="text-white font-bold uppercase tracking-wide">About</h2>
          </div>
          <div className="text-neutral-500 text-sm">
            <p>SoCalOffroaders</p>
            <p className="mt-1">Built with Next.js + Supabase</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={!user}
          className="w-full flex items-center justify-center gap-2 py-3 bg-red-900/30 border-2 border-red-800 text-red-400 font-bold uppercase tracking-wider rounded-lg hover:bg-red-900/50 transition-colors disabled:opacity-40"
        >
          <LogOut size={18} />
          Log Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
