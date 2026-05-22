import { Capacitor } from '@capacitor/core';

export type OAuthSignInPlatform = 'ios' | 'android' | 'web';

export type OAuthSignInVisibility = {
  platform: OAuthSignInPlatform;
  /** Active Google button (Android app + web). */
  showGoogle: boolean;
  /** Active Apple button (iPhone/iPad app only). */
  showApple: boolean;
  /** Grayed Apple teaser on web → /beta/ for TestFlight. */
  showAppleBetaTeaser: boolean;
};

export function getOAuthSignInPlatform(): OAuthSignInPlatform {
  if (typeof window === 'undefined') return 'web';
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

export function getOAuthSignInVisibility(): OAuthSignInVisibility {
  const platform = getOAuthSignInPlatform();
  return {
    platform,
    showGoogle: platform === 'android' || platform === 'web',
    showApple: platform === 'ios',
    showAppleBetaTeaser: platform === 'web',
  };
}

export function oauthSignInSubtitle(mode: 'login' | 'register', visibility: OAuthSignInVisibility): string {
  const oneAccount =
    'One profile per person — same verified email links automatically; use Settings to connect Google and Apple.';
  if (mode === 'register') {
    if (visibility.platform === 'ios') {
      return `Create your account with Apple. Already joined? Sign in — we will not create a duplicate if the email matches. ${oneAccount}`;
    }
    return `Create your account with Google. Already joined? Sign in instead. ${oneAccount}`;
  }
  if (visibility.platform === 'ios') {
    return `Sign in with Apple. ${oneAccount}`;
  }
  if (visibility.platform === 'android') {
    return `Sign in with Google. ${oneAccount}`;
  }
  return `Sign in with Google. ${oneAccount}`;
}
