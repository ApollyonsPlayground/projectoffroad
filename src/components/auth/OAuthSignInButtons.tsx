'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { AppleSignInButton } from '@/components/auth/AppleSignInButton';
import { AppleSignInBetaTeaser } from '@/components/auth/AppleSignInBetaTeaser';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { isCapacitorNative } from '@/utils/capacitator/isNative';
import {
  getOAuthSignInVisibility,
  oauthSignInSubtitle,
  type OAuthSignInVisibility,
} from '@/utils/auth/oauthSignInPlatform';

/** Bump when Apple/Google auth flow changes — visible on login so TestFlight can confirm fresh JS loaded. */
export const AUTH_SIGNIN_FLOW_ID = 'apple-oauth-browser-v2';

type OAuthSignInButtonsProps = {
  mode: 'login' | 'register';
};

export function OAuthSignInButtons({ mode }: OAuthSignInButtonsProps) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [visibility, setVisibility] = useState<OAuthSignInVisibility | null>(null);
  const { signInWithGoogle, signInWithApple } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    setVisibility(getOAuthSignInVisibility());
  }, []);

  async function handleGoogle() {
    setGoogleLoading(true);
    const { error: err } = await signInWithGoogle();
    if (err) {
      showToast(err, 'error');
      setGoogleLoading(false);
    }
  }

  async function handleApple() {
    setAppleLoading(true);
    const { error: err } = await signInWithApple();
    if (err) {
      showToast(err, 'error');
      setAppleLoading(false);
      return;
    }
    if (isCapacitorNative()) {
      showToast('Opening Apple sign-in — finish in the browser sheet, then return to the app.', 'info');
    }
  }

  if (!visibility) return null;

  const busy = googleLoading || appleLoading;
  const googleLabel = mode === 'login' ? 'Continue with Google' : 'Continue with Google';
  const appleLabel = mode === 'login' ? 'Continue with Apple' : 'Continue with Apple';

  return (
    <>
      <p className="text-muted-foreground text-[13px] text-center leading-snug max-w-[260px]">
        {oauthSignInSubtitle(mode, visibility)}
      </p>

      <div className="w-full flex flex-col items-center gap-3">
        {visibility.platform === 'android' ? (
          <>
            {visibility.showGoogle ? (
              <GoogleSignInButton
                loading={googleLoading}
                disabled={busy && !googleLoading}
                label={googleLabel}
                loadingLabel="Redirecting…"
                onClick={handleGoogle}
              />
            ) : null}
            {visibility.showApple ? (
              <AppleSignInButton
                loading={appleLoading}
                disabled={busy && !appleLoading}
                label={appleLabel}
                loadingLabel="Signing in…"
                onClick={handleApple}
              />
            ) : null}
          </>
        ) : (
          <>
            {visibility.showApple ? (
              <AppleSignInButton
                loading={appleLoading}
                disabled={busy && !appleLoading}
                label={appleLabel}
                loadingLabel="Signing in…"
                onClick={handleApple}
              />
            ) : null}
            {visibility.showGoogle ? (
              <GoogleSignInButton
                loading={googleLoading}
                disabled={busy && !googleLoading}
                label={googleLabel}
                loadingLabel="Redirecting…"
                onClick={handleGoogle}
              />
            ) : null}
          </>
        )}

        {visibility.showAppleBetaTeaser ? <AppleSignInBetaTeaser /> : null}

        <p className="text-[11px] text-muted-foreground text-center max-w-[280px] leading-relaxed">
          One account per person. Same verified email merges automatically; connect Google and Apple in Settings if needed.
        </p>
        <p className="text-[11px] text-muted-foreground text-center max-w-[240px] leading-relaxed">
          By continuing you agree to our community guidelines.
        </p>
        {visibility.platform === 'ios' ? (
          <p className="text-[10px] text-muted-foreground/70 text-center" aria-hidden="true">
            Auth {AUTH_SIGNIN_FLOW_ID}
          </p>
        ) : null}
      </div>
    </>
  );
}
