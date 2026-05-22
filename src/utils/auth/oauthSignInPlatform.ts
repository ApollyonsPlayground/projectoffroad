import { Capacitor } from '@capacitor/core';

export type OAuthSignInPlatform = 'ios' | 'android' | 'web';

export type OAuthSignInVisibility = {
  platform: OAuthSignInPlatform;
  /** Active Google button (all platforms on web + native apps). */
  showGoogle: boolean;
  /** Active Apple button (iOS + Android native apps). */
  showApple: boolean;
  /** Grayed Apple teaser on web only (most web riders use Google). */
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
  const native = platform === 'ios' || platform === 'android';
  return {
    platform,
    showGoogle: true,
    showApple: native,
    showAppleBetaTeaser: platform === 'web',
  };
}

export function oauthSignInSubtitle(mode: 'login' | 'register', visibility: OAuthSignInVisibility): string {
  const oneAccount =
    'One profile per person — same verified email links automatically; use Settings to connect Google and Apple.';
  const verb = mode === 'login' ? 'Sign in' : 'Create an account';
  if (visibility.platform === 'web') {
    return `${verb} with Google on the web. Apple sign-in is in the iPhone and Android apps. ${oneAccount}`;
  }
  if (visibility.platform === 'ios') {
    return `${verb} with Apple or Google. ${oneAccount}`;
  }
  return `${verb} with Google or Apple. ${oneAccount}`;
}
