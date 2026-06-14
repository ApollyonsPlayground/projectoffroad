import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/verifyRequest';
import { isPushSendEnabled } from '@/lib/push/pushConfig';
import { sendPushToUsers } from '@/lib/push/sendPush';

export const runtime = 'nodejs';

const DEFAULT_TITLE = 'SoCal Offroaders';
const DEFAULT_BODY = 'Push test — notifications are working.';

type PushTestBody = {
  title?: string;
  body?: string;
  platform?: 'ios' | 'android';
};

/** One-off admin test push to the signed-in admin's registered devices only. */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isPushSendEnabled()) {
    return NextResponse.json(
      { error: 'PUSH_SEND_ENABLED is not true on the server.' },
      { status: 503 }
    );
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) {
    return NextResponse.json(
      { error: 'FIREBASE_SERVICE_ACCOUNT_JSON is not set on the server.' },
      { status: 503 }
    );
  }

  let body: PushTestBody = {};
  try {
    body = (await request.json()) as PushTestBody;
  } catch {
    /* optional body */
  }

  const platform = body.platform === 'android' ? 'android' : 'ios';
  const title = body.title?.trim() || DEFAULT_TITLE;
  const message = body.body?.trim() || DEFAULT_BODY;

  const result = await sendPushToUsers(
    auth.supabaseAdmin,
    [auth.user.id],
    { title, body: message, data: { type: 'push_test' } },
    { platform }
  );

  if (!result.sent) {
    const status = result.reason === 'no_tokens' ? 404 : 503;
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason,
        platform,
        hint:
          result.reason === 'no_tokens'
            ? `No ${platform} token for your account. Open the native app, sign in, and allow notifications.`
            : 'Check Vercel env vars and redeploy.',
      },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    platform,
    title,
    body: message,
    delivered: result.delivered,
    failed: result.failed,
    tokenCount: result.tokenCount,
    errors: result.errors,
  });
}
