'use client';

import { useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { userHasIdentity } from '@/utils/auth/linkedProviders';

type Props = {
  /** After OAuth link, return here (e.g. current run page). */
  returnPath?: string;
  compact?: boolean;
};

export function GuestAccountUpgrade({ returnPath, compact }: Props) {
  const { user, isGuest, linkGoogle, linkApple, completeGuestUpgrade } = useAuth();
  const { showToast } = useToast();
  const [busy, setBusy] = useState<'google' | 'apple' | 'finish' | null>(null);

  if (!isGuest || !user) return null;

  const googleLinked = userHasIdentity(user, 'google');
  const appleLinked = userHasIdentity(user, 'apple');
  const hasLinkedProvider = googleLinked || appleLinked || !user.is_anonymous;
  const next = returnPath?.startsWith('/') ? returnPath : '/feed/';

  const handleLink = async (provider: 'google' | 'apple') => {
    setBusy(provider);
    try {
      const { error } =
        provider === 'google' ? await linkGoogle(next) : await linkApple(next);
      if (error) {
        showToast(error, 'error');
        return;
      }
      if (provider === 'google') {
        showToast('Finish signing in with Google in your browser, then return here.', 'info');
      }
    } finally {
      setBusy(null);
    }
  };

  const handleFinishUpgrade = async () => {
    setBusy('finish');
    try {
      const result = await completeGuestUpgrade();
      if (result.upgraded) {
        showToast('Welcome to SoCal Offroaders — your full account is ready.', 'success');
      } else if (result.already_member) {
        showToast('You already have a full account.', 'info');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not upgrade account', 'error');
    } finally {
      setBusy(null);
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {!hasLinkedProvider && (
          <>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void handleLink('google')}
              className="text-[12px] font-bold text-primary hover:text-primary/90 disabled:opacity-50"
            >
              {busy === 'google' ? 'Opening…' : 'Connect Google'}
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void handleLink('apple')}
              className="text-[12px] font-bold text-primary hover:text-primary/90 disabled:opacity-50"
            >
              {busy === 'apple' ? 'Connecting…' : 'Connect Apple'}
            </button>
          </>
        )}
        {hasLinkedProvider && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void handleFinishUpgrade()}
            className="text-[12px] font-bold text-primary hover:text-primary/90 disabled:opacity-50 inline-flex items-center gap-1"
          >
            {busy === 'finish' ? <Loader2 size={12} className="animate-spin" /> : null}
            Complete sign-up
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-4 space-y-3">
      <div className="flex items-start gap-2">
        <UserPlus size={18} className="text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[15px] font-bold text-foreground">Create your free account</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">
            Connect Google or Apple to keep your trail name and unlock the full app — feed, clubs, DMs, and
            future runs.
          </p>
        </div>
      </div>

      {!hasLinkedProvider ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void handleLink('google')}
            className="py-2.5 rounded-xl bg-card border border-border text-[13px] font-bold hover:border-primary/40 disabled:opacity-50"
          >
            {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void handleLink('apple')}
            className="py-2.5 rounded-xl bg-card border border-border text-[13px] font-bold hover:border-primary/40 disabled:opacity-50"
          >
            {busy === 'apple' ? 'Connecting Apple…' : 'Continue with Apple'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void handleFinishUpgrade()}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-[14px] font-black hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busy === 'finish' ? <Loader2 size={16} className="animate-spin" /> : null}
          Complete sign-up
        </button>
      )}
    </div>
  );
}
