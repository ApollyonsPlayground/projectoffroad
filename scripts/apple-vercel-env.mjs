#!/usr/bin/env node
/**
 * Prepare Apple Sign In env vars for Vercel (monthly /api/cron/apple-secret rotation).
 *
 * Usage:
 *   node --env-file=.env.local scripts/apple-vercel-env.mjs
 *
 * Writes a gitignored snippet file with APPLE_PRIVATE_KEY formatted for Vercel paste.
 * Does not print the private key to the terminal.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const secretsDir = join(root, '.secrets');
const outFile = join(secretsDir, 'vercel-apple-env-snippet.txt');

function required(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env: ${name} (set in .env.local)`);
  return v;
}

function loadPrivateKeyPem() {
  const path = process.env.APPLE_PRIVATE_KEY_PATH?.trim();
  if (path) return readFileSync(path, 'utf8').trim();
  const inline = process.env.APPLE_PRIVATE_KEY?.trim();
  if (!inline) throw new Error('Set APPLE_PRIVATE_KEY_PATH or APPLE_PRIVATE_KEY in .env.local');
  return inline.replace(/\\n/g, '\n').trim();
}

function pemToVercelOneLine(pem) {
  return pem.replace(/\r\n/g, '\n').replace(/\n/g, '\\n');
}

function projectRefFromEnv() {
  const explicit = process.env.SUPABASE_PROJECT_REF?.trim();
  if (explicit) return explicit;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (url) return new URL(url).hostname.split('.')[0];
  throw new Error('Set SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL');
}

try {
  const teamId = required('APPLE_TEAM_ID');
  const keyId = required('APPLE_KEY_ID');
  const servicesId = required('APPLE_SERVICES_ID');
  const bundleId = process.env.APPLE_BUNDLE_ID?.trim() || 'com.socaloffroaders.app';
  const projectRef = projectRefFromEnv();
  const privateKeyOneLine = pemToVercelOneLine(loadPrivateKeyPem());

  mkdirSync(secretsDir, { recursive: true });

  const snippet = `# Vercel → Project → Settings → Environment Variables → Production (+ Preview if you want)
# Copy each NAME and VALUE below. Delete this file after pasting.
# SUPABASE_ACCESS_TOKEN — you said this is already on Vercel; skip if set.

APPLE_TEAM_ID=${teamId}
APPLE_KEY_ID=${keyId}
APPLE_SERVICES_ID=${servicesId}
APPLE_BUNDLE_ID=${bundleId}
SUPABASE_PROJECT_REF=${projectRef}
CRON_SECRET=(use the same value already on Vercel for other crons)

# Sensitive — paste as one line in Vercel (keep \\n as literal backslash-n):
APPLE_PRIVATE_KEY=${privateKeyOneLine}
`;

  writeFileSync(outFile, snippet, 'utf8');

  console.log('Vercel Apple Sign In env checklist');
  console.log('==================================');
  console.log('');
  console.log('Already on Vercel (you confirmed):');
  console.log('  ✓ SUPABASE_ACCESS_TOKEN');
  console.log('  ✓ CRON_SECRET (for /api/cron/*)');
  console.log('');
  console.log('Add these in Vercel → Settings → Environment Variables → Production:');
  console.log(`  APPLE_TEAM_ID          = ${teamId}`);
  console.log(`  APPLE_KEY_ID           = ${keyId}`);
  console.log(`  APPLE_SERVICES_ID      = ${servicesId}`);
  console.log(`  APPLE_BUNDLE_ID        = ${bundleId}`);
  console.log(`  SUPABASE_PROJECT_REF   = ${projectRef}`);
  console.log('  APPLE_PRIVATE_KEY      = (see snippet file — not printed here)');
  console.log('');
  console.log(`Snippet written: ${outFile}`);
  console.log('Open that file, copy APPLE_PRIVATE_KEY into Vercel, then delete the snippet.');
  console.log('');
  console.log('After deploy, test rotation:');
  console.log('  curl -H "Authorization: Bearer <CRON_SECRET>" https://socaloffroaders.com/api/cron/apple-secret');
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
