import { requireAdmin } from '@/lib/admin/verifyRequest';
import {
  buildAppleSecretStatusMessage,
  getAppleSecretEnvStatus,
  getLatestAppleSecretRotation,
  isAppleSecretFullyConfigured,
  maxTtlDays,
  missingAppleSecretEnvKeys,
  resolveAppleSecretStatusLevel,
  rotateAppleSignInSecret,
} from '@/lib/apple/rotateSecret';

export const runtime = 'nodejs';

/** Admin: Apple OAuth secret status + manual rotation. */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const env = getAppleSecretEnvStatus();
  let last = null;
  try {
    last = await getLatestAppleSecretRotation(auth.supabaseAdmin);
  } catch (e) {
    console.warn('[admin/apple-secret] read rotation:', e);
  }

  const { level, daysUntilExpiry } = resolveAppleSecretStatusLevel(env, last);

  return Response.json({
    configured: isAppleSecretFullyConfigured(env),
    missingEnv: missingAppleSecretEnvKeys(env),
    status: level,
    daysUntilExpiry,
    maxTtlDays: maxTtlDays(),
    message: buildAppleSecretStatusMessage(level, daysUntilExpiry),
    lastRotation: last
      ? {
          rotatedAt: last.rotated_at,
          expiresAt: last.expires_at,
          rotatedBy: last.rotated_by,
          servicesId: last.services_id,
          keyId: last.key_id,
        }
      : null,
    autoRotation: {
      cronPath: '/api/cron/apple-secret',
      schedule: '1st of each month (Vercel cron)',
    },
  });
}

/** Admin: rotate Apple client secret JWT and push to Supabase. */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const result = await rotateAppleSignInSecret('admin', auth.supabaseAdmin);
  if (!result.ok) {
    return Response.json(
      { error: result.error, hint: result.hint, status: result.status },
      { status: result.status >= 400 ? result.status : 502 }
    );
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(result.expiresAt).getTime() - Date.now()) / 86_400_000
  );

  return Response.json({
    ok: true,
    expiresAt: result.expiresAt,
    daysUntilExpiry,
    servicesId: result.servicesId,
    bundleId: result.bundleId,
    keyId: result.keyId,
    message: `Apple secret rotated. Valid for about ${daysUntilExpiry} days.`,
  });
}
