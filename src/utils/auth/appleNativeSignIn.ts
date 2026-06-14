import type { SupabaseClient } from '@supabase/supabase-js';
import { AppleSignIn, ErrorCode, SignInScope } from '@capawesome/capacitor-apple-sign-in';
import { formatOAuthAuthError } from '@/utils/auth/oauthIdentityErrors';

function randomNonce(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i]! % chars.length];
  }
  return result;
}

/** Apple ASAuthorizationAppleIDRequest.nonce must be SHA-256 of the raw nonce, hex-encoded. */
async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isPluginMissingOnIos(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('not implemented on ios') || lower.includes('unimplemented');
}

function pluginMissingHelp(): string {
  return 'This app build does not include native Apple sign-in yet. On your Mac: git pull, npm ci, rm -rf ios, npx cap add ios, npx cap sync ios, then Archive to TestFlight.';
}

function isUserCancel(message: string, code?: string): boolean {
  if (code === ErrorCode.SignInCanceled) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes('cancel') ||
    lower.includes('1001') ||
    lower.includes('user canceled') ||
    lower.includes('user cancelled')
  );
}

function formatAppleSupabaseError(
  message: string,
  code?: string,
  idToken?: string,
  status?: number
): string {
  const raw = message.trim();
  const c = code?.trim() ?? '';
  const detail = [status ? `HTTP ${status}` : '', c, raw].filter(Boolean).join(' · ');

  const lower = `${raw} ${c}`.toLowerCase();
  if (lower.includes('nonce') && lower.includes('mismatch')) {
    return 'Apple sign-in failed (nonce verification). Deploy the latest app update and try again.';
  }
  if (lower.includes('client') || lower.includes('audience') || lower.includes('invalid claim')) {
    const aud = idToken ? decodeJwtPayload(idToken)?.aud : null;
    const audHint = aud ? ` Token audience: ${String(aud)}.` : '';
    return (
      `Supabase rejected the Apple token.${audHint} Client IDs must include com.socaloffroaders.app. ` +
      (detail ? `(${detail})` : '')
    );
  }
  if (
    code === 'email_exists' ||
    lower.includes('already registered') ||
    lower.includes('email already exists')
  ) {
    return formatOAuthAuthError(raw, { code, provider: 'apple' });
  }
  if (detail) {
    return `Apple sign-in failed (${detail}).`;
  }
  const aud = idToken ? decodeJwtPayload(idToken)?.aud : null;
  if (aud) {
    return `Apple sign-in failed. Token audience is ${String(aud)} — ensure it is listed in Supabase Apple Client IDs.`;
  }
  return 'Apple sign-in failed. Try Google sign-in, then connect Apple in Settings.';
}

export type AppleNativeAuthMode = 'signIn' | 'link';

/** Native iOS Sign in with Apple → sign-in or link to the current session. */
export async function appleNativeAuth(
  supabase: SupabaseClient,
  mode: AppleNativeAuthMode
): Promise<{ error: string | null }> {
  try {
    const rawNonce = randomNonce();
    const hashedNonce = await sha256Hex(rawNonce);

    // Capawesome sets request.nonce as-is; Apple requires SHA-256 hex of the raw nonce.
    const result = await AppleSignIn.signIn({
      nonce: hashedNonce,
      scopes: [SignInScope.Email, SignInScope.FullName],
    });

    if (!result.idToken) {
      return { error: 'Apple sign-in did not return an identity token.' };
    }

    // Do not pass `nonce` to Supabase — hosted GoTrue hex vs base64url mismatch (see supabase/auth#2378).
    const credentials = {
      provider: 'apple' as const,
      token: result.idToken,
    };

    const { data, error } =
      mode === 'link'
        ? await supabase.auth.linkIdentity(credentials)
        : await supabase.auth.signInWithIdToken(credentials);

    if (error) {
      const raw = error.message ?? '';
      const errCode = (error as { code?: string }).code ?? '';
      const status = (error as { status?: number }).status;
      if (raw.toLowerCase().includes('invalid grant') || raw.toLowerCase().includes('code verifier')) {
        return {
          error:
            'Sign-in session expired. Close the app completely, reopen, and try again.',
        };
      }
      return {
        error: formatAppleSupabaseError(raw, errCode, result.idToken, status),
      };
    }

    if (mode === 'signIn' && !data.session) {
      return { error: 'Apple accepted but no session was saved. Close the app and try again.' };
    }

    if (mode === 'signIn') {
      const fullName = [result.givenName, result.familyName].filter(Boolean).join(' ').trim();
      if (fullName) {
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            given_name: result.givenName ?? undefined,
            family_name: result.familyName ?? undefined,
          },
        });
      }
    }

    return { error: null };
  } catch (e) {
    const err = e as { message?: string; code?: string };
    const msg = err?.message ?? String(e);
    if (isUserCancel(msg, err?.code)) return { error: null };
    if (isPluginMissingOnIos(msg)) return { error: pluginMissingHelp() };
    return { error: msg || 'Apple sign-in failed.' };
  }
}

/** @deprecated Use appleNativeAuth(supabase, 'signIn') */
export async function signInWithAppleNative(
  supabase: SupabaseClient
): Promise<{ error: string | null }> {
  return appleNativeAuth(supabase, 'signIn');
}
