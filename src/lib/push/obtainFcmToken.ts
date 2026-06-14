import { Capacitor } from '@capacitor/core';
import { isNativePluginAvailable } from '@/lib/capacitor/isPluginAvailable';
import { isCapacitorNative } from '@/utils/capacitator/isNative';

const FCM_RETRY_MS = 500;
const FCM_MAX_WAIT_MS = 18_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * FCM registration token for Firebase Admin send.
 * Android: Capacitor Push returns FCM already; FCM.getToken() works too.
 * iOS: Capacitor Push returns APNs only — must use @capacitor-community/fcm.
 */
export async function obtainFcmDeviceToken(): Promise<string> {
  if (!isCapacitorNative()) {
    throw new Error('FCM token is only available in the native app.');
  }
  if (!isNativePluginAvailable('FCM')) {
    throw new Error(
      'FCM plugin missing in this build. Run npx cap sync ios on Mac, add GoogleService-Info.plist, and upload a new TestFlight build.'
    );
  }

  const { FCM } = await import('@capacitor-community/fcm');
  const started = Date.now();
  let lastError: unknown;

  while (Date.now() - started < FCM_MAX_WAIT_MS) {
    try {
      const { token } = await FCM.getToken();
      const trimmed = token?.trim();
      if (trimmed) return trimmed;
    } catch (err) {
      lastError = err;
    }
    await sleep(FCM_RETRY_MS);
  }

  const detail =
    lastError instanceof Error
      ? lastError.message
      : lastError
        ? String(lastError)
        : 'FCM returned an empty token.';
  const isIos = Capacitor.getPlatform() === 'ios';
  if (isIos) {
    throw new Error(
      `${detail} On iOS, add GoogleService-Info.plist in Xcode, upload APNs key to Firebase, and install the latest TestFlight build.`
    );
  }
  throw new Error(detail);
}
