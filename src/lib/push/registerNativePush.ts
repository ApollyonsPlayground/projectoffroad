import { Capacitor } from '@capacitor/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isNativePluginAvailable } from '@/lib/capacitor/isPluginAvailable';
import { isCapacitorNative } from '@/utils/capacitator/isNative';
import { isPushRegistrationEnabled } from '@/lib/push/pushConfig';

export type PushPlatform = 'ios' | 'android';

export type PushRegistrationStatus =
  | 'disabled'
  | 'unavailable'
  | 'denied'
  | 'granted'
  | 'token_saved'
  | 'error';

export type PushRegistrationResult = {
  status: PushRegistrationStatus;
  message: string;
};

let listenersBound = false;
let registerInFlight = false;
let registeredUserId: string | null = null;
let currentToken: string | null = null;
let activeUserId: string | null = null;
let activeSupabase: SupabaseClient | null = null;
let pendingRegistration:
  | {
      resolve: (result: PushRegistrationResult) => void;
      reject: (err: unknown) => void;
      userId: string;
      tokenSaved: boolean;
    }
  | null = null;

function pushPlatform(): PushPlatform | null {
  const p = Capacitor.getPlatform();
  if (p === 'ios' || p === 'android') return p;
  return null;
}

function platformSettingsHint(): string {
  const p = Capacitor.getPlatform();
  if (p === 'ios') {
    return 'Open Settings → SoCal Offroaders → Notifications → Allow Notifications.';
  }
  if (p === 'android') {
    return 'Open Settings → Apps → SoCal Offroaders → Notifications and allow them.';
  }
  return 'Allow notifications in your device settings.';
}

export async function upsertPushDeviceToken(
  sb: SupabaseClient,
  userId: string,
  token: string,
  platform: PushPlatform
): Promise<void> {
  const { error } = await sb.from('push_device_tokens').upsert(
    {
      user_id: userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'token' }
  );
  if (error) throw error;
}

export async function removePushDeviceToken(sb: SupabaseClient, token: string): Promise<void> {
  const { error } = await sb.from('push_device_tokens').delete().eq('token', token);
  if (error) throw error;
}

export function getRegisteredPushToken(): string | null {
  return currentToken;
}

function resolvePending(result: PushRegistrationResult): void {
  const pending = pendingRegistration;
  pendingRegistration = null;
  pending?.resolve(result);
}

function failPending(message: string): void {
  registeredUserId = null;
  resolvePending({ status: 'error', message });
}

async function ensurePushListeners(): Promise<void> {
  if (listenersBound) return;
  listenersBound = true;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  await PushNotifications.addListener('registration', (ev) => {
    const token = ev.value?.trim();
    if (!token || !activeUserId || !activeSupabase) return;
    const plat = pushPlatform();
    if (!plat) return;
    currentToken = token;
    void upsertPushDeviceToken(activeSupabase, activeUserId, token, plat)
      .then(() => {
        registeredUserId = activeUserId;
        if (pendingRegistration?.userId === activeUserId) {
          pendingRegistration.tokenSaved = true;
          resolvePending({
            status: 'token_saved',
            message: 'Push notifications enabled.',
          });
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Could not save device token.';
        console.warn('[push] token upsert failed', err);
        failPending(msg);
      });
  });

  await PushNotifications.addListener('registrationError', (err) => {
    const msg =
      typeof err === 'object' && err && 'error' in err && typeof err.error === 'string'
        ? err.error
        : 'Push registration failed on this device.';
    console.warn('[push] registration failed', err);
    failPending(
      `${msg} Install the latest TestFlight build with push entitlements, or update from the store.`
    );
  });

  await PushNotifications.addListener('pushNotificationReceived', () => {
    /* intentionally empty */
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', () => {
    /* intentionally empty */
  });
}

/**
 * Register for remote push with a user-visible result (Settings button).
 */
export async function registerNativePushWithResult(
  sb: SupabaseClient,
  userId: string,
  options?: { force?: boolean }
): Promise<PushRegistrationResult> {
  if (!isPushRegistrationEnabled()) {
    return {
      status: 'disabled',
      message: 'Push registration is not enabled on this server yet.',
    };
  }
  if (!isCapacitorNative()) {
    return { status: 'unavailable', message: 'Push notifications are only available in the native app.' };
  }
  const platform = pushPlatform();
  if (!platform) {
    return { status: 'unavailable', message: 'Push notifications are not supported on this device.' };
  }
  if (!isNativePluginAvailable('PushNotifications')) {
    return {
      status: 'unavailable',
      message: 'This app build does not include push support. Update from TestFlight or the store.',
    };
  }
  if (registerInFlight) {
    return { status: 'error', message: 'Push registration is already in progress. Try again in a moment.' };
  }
  if (!options?.force && registeredUserId === userId && currentToken) {
    return { status: 'token_saved', message: 'Push notifications are already enabled on this device.' };
  }

  activeUserId = userId;
  activeSupabase = sb;
  registerInFlight = true;
  registeredUserId = null;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await ensurePushListeners();

    const existingPerm = await PushNotifications.checkPermissions();
    const perm =
      existingPerm.receive === 'granted'
        ? existingPerm
        : await PushNotifications.requestPermissions();

    if (perm.receive !== 'granted') {
      registeredUserId = null;
      return {
        status: 'denied',
        message: `Notifications are blocked. ${platformSettingsHint()}`,
      };
    }

    const waitForToken = new Promise<PushRegistrationResult>((resolve, reject) => {
      pendingRegistration = { resolve, reject, userId, tokenSaved: false };
      window.setTimeout(() => {
        if (!pendingRegistration || pendingRegistration.userId !== userId) return;
        if (pendingRegistration.tokenSaved) return;
        pendingRegistration = null;
        resolve({
          status: 'granted',
          message:
            'Notification permission granted. Your device is registering — try again in a few seconds if admin tests still fail.',
        });
      }, 12_000);
    });

    await PushNotifications.register();

    const tokenResult = await waitForToken;
    if (tokenResult.status === 'token_saved') {
      registeredUserId = userId;
    }
    return tokenResult;
  } catch (err) {
    registeredUserId = null;
    const msg = err instanceof Error ? err.message : 'Push registration failed.';
    console.warn('[push] registration failed', err);
    return { status: 'error', message: msg };
  } finally {
    registerInFlight = false;
    if (pendingRegistration?.userId === userId) {
      pendingRegistration = null;
    }
  }
}

/**
 * Silent registration on sign-in (no UI unless caller handles result).
 */
export async function registerNativePush(sb: SupabaseClient, userId: string): Promise<void> {
  const result = await registerNativePushWithResult(sb, userId);
  if (result.status === 'error' || result.status === 'denied' || result.status === 'unavailable') {
    console.warn('[push]', result.message);
  }
}

export async function unregisterNativePush(sb: SupabaseClient): Promise<void> {
  activeUserId = null;
  activeSupabase = null;
  registeredUserId = null;
  pendingRegistration = null;
  const token = currentToken;
  currentToken = null;
  if (!token) return;
  try {
    await removePushDeviceToken(sb, token);
  } catch (err) {
    console.warn('[push] token delete failed', err);
  }
}
