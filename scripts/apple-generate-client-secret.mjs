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
 *   SUPABASE_ACCESS_TOKEN — optional if Supabase CLI is logged in (`supabase login`)
 */
import { createSign } from 'crypto';
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

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

async function loadSupabaseAccessToken() {
  const fromEnv = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  const tokenFile = join(homedir(), '.supabase', 'access-token');
  if (existsSync(tokenFile)) {
    const fromFile = readFileSync(tokenFile, 'utf8').trim();
    if (fromFile) return fromFile;
  }

  if (process.platform === 'win32') {
    const ps = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class SupabaseCred {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags; public int Type; public IntPtr TargetName; public IntPtr Comment;
    public long LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob;
    public int Persist; public int AttributeCount; public IntPtr Attributes; public IntPtr TargetAlias; public IntPtr UserName;
  }
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr cred);
  [DllImport("advapi32.dll")] public static extern void CredFree(IntPtr cred);
  public static string Read(string target) {
    IntPtr nCred;
    if (!CredRead(target, 1, 0, out nCred)) return null;
    var c = (CREDENTIAL)Marshal.PtrToStructure(nCred, typeof(CREDENTIAL));
    var bytes = new byte[c.CredentialBlobSize];
    Marshal.Copy(c.CredentialBlob, bytes, 0, c.CredentialBlobSize);
    CredFree(nCred);
    return Encoding.UTF8.GetString(bytes).Trim();
  }
}
"@
$t = [SupabaseCred]::Read('Supabase CLI:supabase')
if ($t) { Write-Output $t }
`;
    const fromCred = execFileSync('powershell', ['-NoProfile', '-Command', ps], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (fromCred.startsWith('sbp_')) return fromCred;
  }

  throw new Error(
    'No Supabase access token. Run: npx supabase login — or set SUPABASE_ACCESS_TOKEN in .env.local (Dashboard → Account → Access Tokens).'
  );
}

async function syncToSupabase({ secret, servicesId, bundleId }) {
  const accessToken = await loadSupabaseAccessToken();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const projectRef =
    process.env.SUPABASE_PROJECT_REF?.trim() ||
    (url ? new URL(url).hostname.split('.')[0] : '');
  if (!projectRef) {
    throw new Error('Set SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL in .env.local');
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
    console.log('# Or run: npm run apple:sync-apple-secret (uses Supabase CLI login if available)');
    console.log('');
    console.log(secret);
    console.log('');
    console.log(`# Expires (approx): ${expiresAt}`);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
