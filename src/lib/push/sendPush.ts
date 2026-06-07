import { isPushSendEnabled } from '@/lib/push/pushConfig';

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export type PushSendResult =
  | { sent: false; reason: 'disabled' | 'not_implemented' }
  | { sent: true; delivered: number };

/**
 * Remote push delivery stub. Intentionally does not send until PUSH_SEND_ENABLED=true
 * and FCM/APNs HTTP integration is added.
 */
export async function sendPushToTokens(
  tokens: string[],
  payload: PushPayload
): Promise<PushSendResult> {
  void tokens;
  void payload;
  if (!isPushSendEnabled()) {
    return { sent: false, reason: 'disabled' };
  }
  // Future: Firebase Admin / APNs HTTP/2 using stored tokens.
  return { sent: false, reason: 'not_implemented' };
}
