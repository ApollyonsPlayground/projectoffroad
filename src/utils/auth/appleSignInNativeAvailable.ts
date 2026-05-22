import { Capacitor } from '@capacitor/core';

/** True when the iOS shell includes the SignInWithApple Capacitor plugin (requires cap sync + rebuild). */
export function isAppleSignInNativeAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.getPlatform() !== 'ios') return false;
  return Capacitor.isPluginAvailable('AppleSignIn');
}
