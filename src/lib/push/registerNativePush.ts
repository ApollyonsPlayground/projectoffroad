import { Capacitor } from '@capacitor/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isCapacitorNative } from '@/utils/capacitator/isNative';
import { isPushRegistrationEnabled } from '@/lib/push/pushConfig';

export type PushPlatform = 'ios' | 'android';

let listenersBound = false;
let currentToken: string | null = null;
let activeUserId: string | null = null;
let activeSupabase: SupabaseClient | null = null;

function pushPlatform(): PushPlatform | null {
  const p = Capacitor.getPlatform();
  if (p === 'ios' || p === 'android') return p;
  return null;
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

/**
 * Register for remote push on native iOS/Android and persist the device token.
 * Does not display notifications unless the server sends them (currently disabled).
 */
export async function registerNativePush(sb: SupabaseClient, userId: string): Promise<void> {
  if (!isPushRegistrationEnabled() || !isCapacitorNative()) return;
  const platform = pushPlatform();
  if (!platform) return;

  activeUserId = userId;
  activeSupabase = sb;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  if (!listenersBound) {
    listenersBound = true;

    await PushNotifications.addListener('registration', (ev) => {
      const token = ev.value?.trim();
      if (!token || !activeUserId || !activeSupabase) return;
      const plat = pushPlatform();
      if (!plat) return;
      currentToken = token;
      void upsertPushDeviceToken(activeSupabase, activeUserId, token, plat).catch((err) => {
        console.warn('[push] token upsert failed', err);
      });
    });

    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push] registration failed', err);
    });

    // Foreground delivery — no UI until we intentionally send pushes.
    await PushNotifications.addListener('pushNotificationReceived', () => {
      /* intentionally empty */
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', () => {
      /* intentionally empty */
    });
  }

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return;

  await PushNotifications.register();
}

export async function unregisterNativePush(sb: SupabaseClient): Promise<void> {
  activeUserId = null;
  activeSupabase = null;
  const token = currentToken;
  currentToken = null;
  if (!token) return;
  try {
    await removePushDeviceToken(sb, token);
  } catch (err) {
    console.warn('[push] token delete failed', err);
  }
}
