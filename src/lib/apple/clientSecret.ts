import { createSign } from 'crypto';

/** Apple allows at most ~6 months (15777000 s) between iat and exp. */
export const APPLE_CLIENT_SECRET_MAX_TTL_SECONDS = 15_777_000;

export type AppleSignInKeyConfig = {
  teamId: string;
  keyId: string;
  servicesId: string;
  privateKeyPem: string;
  bundleId?: string;
};

export function normalizeApplePrivateKeyPem(raw: string): string {
  return raw.trim().replace(/\\n/g, '\n');
}

export function readAppleSignInKeyConfigFromEnv(): AppleSignInKeyConfig | null {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const keyId = process.env.APPLE_KEY_ID?.trim();
  const servicesId = process.env.APPLE_SERVICES_ID?.trim();
  const privateKeyRaw = process.env.APPLE_PRIVATE_KEY?.trim();
  if (!teamId || !keyId || !servicesId || !privateKeyRaw) return null;

  return {
    teamId,
    keyId,
    servicesId,
    privateKeyPem: normalizeApplePrivateKeyPem(privateKeyRaw),
    bundleId: process.env.APPLE_BUNDLE_ID?.trim() || 'com.socaloffroaders.app',
  };
}

/** ES256 client secret JWT for Supabase / Apple OAuth (not the .p8 file itself). */
export function generateAppleClientSecret(
  config: Pick<AppleSignInKeyConfig, 'teamId' | 'keyId' | 'servicesId' | 'privateKeyPem'>,
  options?: { nowSeconds?: number; ttlSeconds?: number }
): string {
  const now = options?.nowSeconds ?? Math.floor(Date.now() / 1000);
  const ttl = Math.min(
    options?.ttlSeconds ?? APPLE_CLIENT_SECRET_MAX_TTL_SECONDS,
    APPLE_CLIENT_SECRET_MAX_TTL_SECONDS
  );

  const header = { alg: 'ES256', kid: config.keyId, typ: 'JWT' };
  const payload = {
    iss: config.teamId,
    iat: now,
    exp: now + ttl,
    aud: 'https://appleid.apple.com',
    sub: config.servicesId,
  };

  const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signingInput = `${encode(header)}.${encode(payload)}`;

  const sign = createSign('SHA256');
  sign.update(signingInput);
  sign.end();

  const signature = sign.sign({ key: config.privateKeyPem, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${signature.toString('base64url')}`;
}

export type SupabaseAppleAuthPatch = {
  projectRef: string;
  accessToken: string;
  servicesId: string;
  secret: string;
  bundleId?: string;
};

export async function patchSupabaseAppleAuthConfig(
  patch: SupabaseAppleAuthPatch
): Promise<{ ok: true; expiresAt: string } | { ok: false; status: number; error: string }> {
  const body: Record<string, unknown> = {
    external_apple_enabled: true,
    external_apple_client_id: patch.servicesId,
    external_apple_secret: patch.secret,
  };
  if (patch.bundleId?.trim()) {
    body.external_apple_additional_client_ids = patch.bundleId.trim();
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${patch.projectRef}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${patch.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    return { ok: false, status: res.status, error: error || res.statusText };
  }

  const ttl = APPLE_CLIENT_SECRET_MAX_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  return { ok: true, expiresAt };
}

export function readSupabaseManagementConfigFromEnv(): {
  projectRef: string;
  accessToken: string;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const projectRef =
    process.env.SUPABASE_PROJECT_REF?.trim() ||
    (url ? new URL(url).hostname.split('.')[0] : '');
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!projectRef || !accessToken) return null;
  return { projectRef, accessToken };
}
