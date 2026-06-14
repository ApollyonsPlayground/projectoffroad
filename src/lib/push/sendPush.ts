import type { SupabaseClient } from '@supabase/supabase-js';
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging';
import { isPushSendEnabled } from '@/lib/push/pushConfig';

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export type PushSendResult =
  | { sent: false; reason: 'disabled' | 'not_configured' | 'no_tokens' }
  | { sent: true; delivered: number; failed: number };

function getFirebaseApp(): App | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  if (getApps().length > 0) return getApps()[0]!;

  try {
    const serviceAccount = JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    return initializeApp({ credential: cert(serviceAccount) });
  } catch (err) {
    console.error('[push] invalid FIREBASE_SERVICE_ACCOUNT_JSON', err);
    return null;
  }
}

/**
 * Send FCM messages to device tokens (Android + iOS via Firebase).
 * Requires PUSH_SEND_ENABLED=true and FIREBASE_SERVICE_ACCOUNT_JSON on Vercel.
 */
export async function sendPushToTokens(
  tokens: string[],
  payload: PushPayload
): Promise<PushSendResult> {
  const unique = [...new Set(tokens.map((t) => t.trim()).filter(Boolean))];
  if (unique.length === 0) return { sent: false, reason: 'no_tokens' };

  if (!isPushSendEnabled()) {
    return { sent: false, reason: 'disabled' };
  }

  const app = getFirebaseApp();
  if (!app) {
    return { sent: false, reason: 'not_configured' };
  }

  const messaging = getMessaging(app);
  const message: MulticastMessage = {
    tokens: unique,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data ?? {},
    android: { priority: 'high' },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
  };

  const result = await messaging.sendEachForMulticast(message);
  return {
    sent: true,
    delivered: result.successCount,
    failed: result.failureCount,
  };
}

/** Load tokens for users and send a push (service-role Supabase client). */
export async function sendPushToUsers(
  admin: SupabaseClient,
  userIds: string[],
  payload: PushPayload
): Promise<PushSendResult> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return { sent: false, reason: 'no_tokens' };

  const { data, error } = await admin
    .from('push_device_tokens')
    .select('token')
    .in('user_id', ids);

  if (error) {
    console.error('[push] token lookup failed', error);
    return { sent: false, reason: 'no_tokens' };
  }

  const tokens = (data ?? []).map((row) => String((row as { token: string }).token));
  return sendPushToTokens(tokens, payload);
}
