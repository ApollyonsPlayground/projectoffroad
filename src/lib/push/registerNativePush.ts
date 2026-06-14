import { Capacitor } from '@capacitor/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isNativePluginAvailable } from '@/lib/capacitor/isPluginAvailable';
import { isCapacitorNative } from '@/utils/capacitator/isNative';
import { isPushRegistrationEnabled } from '@/lib/push/pushConfig';
import { obtainFcmDeviceToken } from '@/lib/push/obtainFcmToken';
import { waitForApnsRegistration } from '@/lib/push/waitForApnsRegistration';

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

async function ensurePushErrorListener(): Promise<void> {
  if (listenersBound) return;
  listenersBound = true;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  await PushNotifications.addListener('registrationError', (err) => {
    console.warn('[push] native registration failed', err);
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

  registerInFlight = true;
  registeredUserId = null;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await ensurePushErrorListener();

    const existingPerm = await PushNotifications.checkPermissions();
    let perm = existingPerm;
    // iOS only shows the system dialog when status is "prompt" (first install).
    if (existingPerm.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions();
    }

    if (perm.receive !== 'granted') {
      return {
        status: 'denied',
        message: `Notifications are blocked. ${platformSettingsHint()}`,
      };
    }

    // Required before FCM.getToken() on iOS (registers for APNs under the hood).
    await PushNotifications.register();

    if (platform === 'ios') {
      await waitForApnsRegistration();
    }

    const fcmToken = await obtainFcmDeviceToken();
    await upsertPushDeviceToken(sb, userId, fcmToken, platform);

    currentToken = fcmToken;
    registeredUserId = userId;

    return {
      status: 'token_saved',
      message: 'Push notifications enabled.',
    };
  } catch (err) {
    registeredUserId = null;
    const msg = err instanceof Error ? err.message : 'Push registration failed.';
    console.warn('[push] registration failed', err);
    return { status: 'error', message: msg };
  } finally {
    registerInFlight = false;
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
  registeredUserId = null;
  const token = currentToken;
  currentToken = null;
  if (!token) return;
  try {
    await removePushDeviceToken(sb, token);
  } catch (err) {
    console.warn('[push] token delete failed', err);
  }
}
