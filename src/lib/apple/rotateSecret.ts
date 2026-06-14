import type { SupabaseClient } from '@supabase/supabase-js';
import {
  APPLE_CLIENT_SECRET_MAX_TTL_SECONDS,
  generateAppleClientSecret,
  patchSupabaseAppleAuthConfig,
  readAppleSignInKeyConfigFromEnv,
  readSupabaseManagementConfigFromEnv,
} from '@/lib/apple/clientSecret';

export type AppleSecretRotationSource = 'cron' | 'admin' | 'cli';

export type AppleSecretEnvStatus = {
  appleTeamId: boolean;
  appleKeyId: boolean;
  appleServicesId: boolean;
  applePrivateKey: boolean;
  supabaseAccessToken: boolean;
  supabaseProjectRef: boolean;
};

export type AppleSecretRotationRow = {
  rotated_at: string;
  expires_at: string;
  rotated_by: string;
  services_id: string | null;
  key_id: string | null;
};

export type AppleSecretStatusLevel = 'ok' | 'warning' | 'expired' | 'unknown' | 'not_configured';

export function getAppleSecretEnvStatus(): AppleSecretEnvStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const projectRef =
    process.env.SUPABASE_PROJECT_REF?.trim() ||
    (url ? new URL(url).hostname.split('.')[0] : '');

  return {
    appleTeamId: Boolean(process.env.APPLE_TEAM_ID?.trim()),
    appleKeyId: Boolean(process.env.APPLE_KEY_ID?.trim()),
    appleServicesId: Boolean(process.env.APPLE_SERVICES_ID?.trim()),
    applePrivateKey: Boolean(process.env.APPLE_PRIVATE_KEY?.trim()),
    supabaseAccessToken: Boolean(process.env.SUPABASE_ACCESS_TOKEN?.trim()),
    supabaseProjectRef: Boolean(projectRef),
  };
}

export function isAppleSecretFullyConfigured(env = getAppleSecretEnvStatus()): boolean {
  return (
    env.appleTeamId &&
    env.appleKeyId &&
    env.appleServicesId &&
    env.applePrivateKey &&
    env.supabaseAccessToken &&
    env.supabaseProjectRef
  );
}

export function missingAppleSecretEnvKeys(env = getAppleSecretEnvStatus()): string[] {
  const missing: string[] = [];
  if (!env.appleTeamId) missing.push('APPLE_TEAM_ID');
  if (!env.appleKeyId) missing.push('APPLE_KEY_ID');
  if (!env.appleServicesId) missing.push('APPLE_SERVICES_ID');
  if (!env.applePrivateKey) missing.push('APPLE_PRIVATE_KEY');
  if (!env.supabaseAccessToken) missing.push('SUPABASE_ACCESS_TOKEN');
  if (!env.supabaseProjectRef) missing.push('SUPABASE_PROJECT_REF');
  return missing;
}

export async function getLatestAppleSecretRotation(
  supabaseAdmin: SupabaseClient
): Promise<AppleSecretRotationRow | null> {
  const { data, error } = await supabaseAdmin
    .from('apple_sign_in_secret_rotations')
    .select('rotated_at, expires_at, rotated_by, services_id, key_id')
    .order('rotated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return null;
    throw error;
  }
  return data as AppleSecretRotationRow | null;
}

export async function recordAppleSecretRotation(
  supabaseAdmin: SupabaseClient,
  row: {
    expiresAt: string;
    rotatedBy: AppleSecretRotationSource;
    servicesId?: string;
    keyId?: string;
  }
): Promise<void> {
  const { error } = await supabaseAdmin.from('apple_sign_in_secret_rotations').insert({
    expires_at: row.expiresAt,
    rotated_by: row.rotatedBy,
    services_id: row.servicesId ?? null,
    key_id: row.keyId ?? null,
  });
  if (error && error.code !== '42P01') throw error;
}

export function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export function buildAppleSecretStatusMessage(
  level: AppleSecretStatusLevel,
  daysUntilExpiry: number | null
): string {
  switch (level) {
    case 'not_configured':
      return 'Server env is missing Apple or Supabase Management API variables (see Vercel).';
    case 'unknown':
      return 'No rotation logged yet. Tap Rotate now after the first sync to start the countdown.';
    case 'expired':
      return 'Apple secret JWT has expired — Sign in with Apple will fail until you rotate.';
    case 'warning':
      return `Rotate soon — about ${daysUntilExpiry} day(s) left before Apple sign-in breaks.`;
    case 'ok':
      return `Healthy — about ${daysUntilExpiry} day(s) until the next rotation is due.`;
  }
}

export function resolveAppleSecretStatusLevel(
  env: AppleSecretEnvStatus,
  last: AppleSecretRotationRow | null
): { level: AppleSecretStatusLevel; daysUntilExpiry: number | null } {
  if (!isAppleSecretFullyConfigured(env)) {
    return { level: 'not_configured', daysUntilExpiry: null };
  }
  if (!last?.expires_at) {
    return { level: 'unknown', daysUntilExpiry: null };
  }
  const d = daysUntil(last.expires_at);
  if (d <= 0) return { level: 'expired', daysUntilExpiry: d };
  if (d <= 30) return { level: 'warning', daysUntilExpiry: d };
  return { level: 'ok', daysUntilExpiry: d };
}

export async function rotateAppleSignInSecret(
  rotatedBy: AppleSecretRotationSource,
  supabaseAdmin?: SupabaseClient
): Promise<
  | {
      ok: true;
      expiresAt: string;
      servicesId: string;
      bundleId: string | null;
      keyId: string;
    }
  | { ok: false; status: number; error: string; hint?: string }
> {
  const apple = readAppleSignInKeyConfigFromEnv();
  if (!apple) {
    return {
      ok: false,
      status: 503,
      error: 'Missing Apple key env vars',
      hint: 'Set APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICES_ID, APPLE_PRIVATE_KEY on the server.',
    };
  }

  const mgmt = readSupabaseManagementConfigFromEnv();
  if (!mgmt) {
    return {
      ok: false,
      status: 503,
      error: 'Missing Supabase Management API config',
      hint: 'Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF on the server.',
    };
  }

  let secret: string;
  try {
    secret = generateAppleClientSecret(apple);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 500, error: `Could not sign Apple client secret: ${msg}` };
  }

  const patch = await patchSupabaseAppleAuthConfig({
    projectRef: mgmt.projectRef,
    accessToken: mgmt.accessToken,
    servicesId: apple.servicesId,
    secret,
    bundleId: apple.bundleId,
  });

  if (!patch.ok) {
    return {
      ok: false,
      status: patch.status,
      error: 'Supabase rejected the Apple secret update',
      hint: patch.error.slice(0, 240),
    };
  }

  if (supabaseAdmin) {
    try {
      await recordAppleSecretRotation(supabaseAdmin, {
        expiresAt: patch.expiresAt,
        rotatedBy,
        servicesId: apple.servicesId,
        keyId: apple.keyId,
      });
    } catch (e) {
      console.warn('[apple/rotateSecret] record rotation:', e);
    }
  }

  return {
    ok: true,
    expiresAt: patch.expiresAt,
    servicesId: apple.servicesId,
    bundleId: apple.bundleId ?? null,
    keyId: apple.keyId,
  };
}

export function maxTtlDays(): number {
  return Math.floor(APPLE_CLIENT_SECRET_MAX_TTL_SECONDS / 86_400);
}
