#!/usr/bin/env node
/**
 * Generate (and optionally sync) the Apple OAuth client secret JWT for Supabase.
 *
 * Usage:
 *   node --env-file=.env.local scripts/apple-generate-client-secret.mjs
 *   node --env-file=.env.local scripts/apple-generate-client-secret.mjs --sync
 *
 * Env:
 *   APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICES_ID
 *   APPLE_PRIVATE_KEY  — PEM contents (use \n for newlines in .env)
 *   APPLE_PRIVATE_KEY_PATH — optional path to AuthKey_XXXX.p8 (overrides APPLE_PRIVATE_KEY)
 *   APPLE_BUNDLE_ID — optional, default com.socaloffroaders.app
 *   SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF (or NEXT_PUBLIC_SUPABASE_URL) for --sync
 */
import { createSign } from 'crypto';
import { readFileSync } from 'fs';

const APPLE_CLIENT_SECRET_MAX_TTL_SECONDS = 15_777_000;

function normalizePem(raw) {
  return raw.trim().replace(/\\n/g, '\n');
}

function loadPrivateKeyPem() {
  const path = process.env.APPLE_PRIVATE_KEY_PATH?.trim();
  if (path) return normalizePem(readFileSync(path, 'utf8'));
  const inline = process.env.APPLE_PRIVATE_KEY?.trim();
  if (!inline) {
    throw new Error('Set APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_PATH');
  }
  return normalizePem(inline);
}

function generateAppleClientSecret({ teamId, keyId, servicesId, privateKeyPem }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + APPLE_CLIENT_SECRET_MAX_TTL_SECONDS,
    aud: 'https://appleid.apple.com',
    sub: servicesId,
  };
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signingInput = `${encode(header)}.${encode(payload)}`;
  const sign = createSign('SHA256');
  sign.update(signingInput);
  sign.end();
  const signature = sign.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${signature.toString('base64url')}`;
}

async function syncToSupabase({ secret, servicesId, bundleId }) {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const projectRef =
    process.env.SUPABASE_PROJECT_REF?.trim() ||
    (url ? new URL(url).hostname.split('.')[0] : '');
  if (!accessToken || !projectRef) {
    throw new Error('For --sync set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF (or NEXT_PUBLIC_SUPABASE_URL)');
  }

  const body = {
    external_apple_enabled: true,
    external_apple_client_id: servicesId,
    external_apple_secret: secret,
  };
  if (bundleId) body.external_apple_additional_client_ids = bundleId;

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase PATCH failed (${res.status}): ${text}`);
  }
}

function required(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const sync = process.argv.includes('--sync');

try {
  const teamId = required('APPLE_TEAM_ID');
  const keyId = required('APPLE_KEY_ID');
  const servicesId = required('APPLE_SERVICES_ID');
  const bundleId = process.env.APPLE_BUNDLE_ID?.trim() || 'com.socaloffroaders.app';
  const privateKeyPem = loadPrivateKeyPem();

  const secret = generateAppleClientSecret({ teamId, keyId, servicesId, privateKeyPem });
  const expiresAt = new Date(Date.now() + APPLE_CLIENT_SECRET_MAX_TTL_SECONDS * 1000).toISOString();

  if (sync) {
    await syncToSupabase({ secret, servicesId, bundleId });
    console.log('Synced Apple client secret to Supabase Auth.');
    console.log(`Services ID: ${servicesId}`);
    console.log(`Bundle ID (additional): ${bundleId}`);
    console.log(`Valid until: ${expiresAt}`);
  } else {
    console.log('# Paste into Supabase → Authentication → Providers → Apple → Secret Key');
    console.log('# Or run with --sync after setting SUPABASE_ACCESS_TOKEN');
    console.log('');
    console.log(secret);
    console.log('');
    console.log(`# Expires (approx): ${expiresAt}`);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
