import type { PluginListenerHandle } from '@capacitor/core';

const APNS_WAIT_MS = 20_000;

/**
 * iOS: PushNotifications.register() returns before APNs delivers the device token.
 * FCM needs that token (via AppDelegate → Capacitor) before getToken() works.
 */
export async function waitForApnsRegistration(): Promise<void> {
  const { PushNotifications } = await import('@capacitor/push-notifications');

  return new Promise((resolve, reject) => {
    let settled = false;
    const handles: PluginListenerHandle[] = [];

    const cleanup = () => {
      void Promise.all(handles.map((h) => h.remove()));
    };

    const finish = (ok: boolean, err?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      if (ok) resolve();
      else reject(err ?? new Error('APNs registration failed.'));
    };

    const timer = window.setTimeout(() => {
      finish(
        false,
        new Error(
          'Timed out waiting for APNs token. On Mac run npm run ios:appdelegate-push, enable Push Notifications in Xcode, and upload a new build.'
        )
      );
    }, APNS_WAIT_MS);

    void PushNotifications.addListener('registration', () => finish(true)).then((h) =>
      handles.push(h)
    );
    void PushNotifications.addListener('registrationError', (e) => {
      const msg =
        typeof e?.error === 'string' && e.error.trim()
          ? e.error
          : 'APNs registration failed. Check Push Notifications capability and provisioning.';
      finish(false, new Error(msg));
    }).then((h) => handles.push(h));
  });
}
