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
  const verb = mode === 'login' ? 'Sign in' : 'Create an account';
  if (visibility.platform === 'ios') {
    return `${verb} with Apple to access trails and community features.`;
  }
  if (visibility.platform === 'android') {
    return `${verb} with Google to access trails and community features.`;
  }
  return `${verb} with Google to access trails and community features.`;
}
