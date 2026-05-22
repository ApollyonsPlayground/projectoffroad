'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { userHasIdentity, userLinkedProviderLabels } from '@/utils/auth/linkedProviders';
import { isIosNative } from '@/utils/capacitator/isIosNative';

export function ConnectedAccounts() {
  const { user, linkGoogle, linkApple, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  if (!user) return null;

  const googleLinked = userHasIdentity(user, 'google');
  const appleLinked = userHasIdentity(user, 'apple');

  async function handleLinkGoogle() {
    setGoogleLoading(true);
    const { error } = await linkGoogle();
    if (error) {
      showToast(error, 'error');
      setGoogleLoading(false);
      return;
    }
    if (!isIosNative()) {
      return;
    }
    await refreshProfile();
    setGoogleLoading(false);
  }

  async function handleLinkApple() {
    setAppleLoading(true);
    const { error } = await linkApple();
    if (error) {
      showToast(error, 'error');
      setAppleLoading(false);
      return;
    }
    await refreshProfile();
    showToast('Apple connected to your account', 'success');
    setAppleLoading(false);
  }

  return (
    <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4">
      <h2 className="text-foreground font-bold uppercase tracking-wide mb-1">Connected accounts</h2>
      <p className="text-neutral-500 text-[11px] leading-relaxed mb-4">
        One SoCal Offroaders profile per person. If Google and Apple use the same verified email, we merge them
        automatically. Otherwise connect both here so you do not end up with two accounts.
      </p>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between gap-3 items-center py-2 border-b border-neutral-800">
          <span className="text-neutral-400">Active sign-in</span>
          <span className="text-neutral-200">{userLinkedProviderLabels(user)}</span>
        </div>

        <div className="flex justify-between gap-3 items-center">
          <span className="text-neutral-400">Google</span>
          {googleLinked ? (
            <span className="text-emerald-400/90 text-[12px] font-semibold uppercase tracking-wide">Connected</span>
          ) : (
            <button
              type="button"
              disabled={googleLoading || appleLoading}
              onClick={() => void handleLinkGoogle()}
              className="text-[12px] font-bold uppercase tracking-wide text-primary hover:text-primary/80 disabled:opacity-50"
            >
              {googleLoading ? 'Opening…' : 'Connect Google'}
            </button>
          )}
        </div>

        <div className="flex justify-between gap-3 items-center">
          <span className="text-neutral-400">Apple</span>
          {appleLinked ? (
            <span className="text-emerald-400/90 text-[12px] font-semibold uppercase tracking-wide">Connected</span>
          ) : (
            <button
              type="button"
              disabled={googleLoading || appleLoading}
              onClick={() => void handleLinkApple()}
              className="text-[12px] font-bold uppercase tracking-wide text-primary hover:text-primary/80 disabled:opacity-50"
            >
              {appleLoading ? 'Connecting…' : 'Connect Apple'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
