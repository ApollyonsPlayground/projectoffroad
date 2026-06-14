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

function formatAppleSupabaseError(message: string, code?: string): string {
  const raw = message.trim();
  const c = code?.trim() ?? '';
  const detail = [c, raw].filter(Boolean).join(': ');

  const lower = `${raw} ${c}`.toLowerCase();
  if (lower.includes('nonce') && lower.includes('mismatch')) {
    return 'Apple sign-in failed (nonce verification). Deploy the latest app update and try again.';
  }
  if (lower.includes('client') || lower.includes('audience') || lower.includes('invalid claim')) {
    return (
      'Supabase rejected the Apple token. Dashboard → Authentication → Providers → Apple → Client IDs must include com.socaloffroaders.app (your iOS bundle ID). ' +
      (detail ? `(${detail})` : '')
    );
  }
  if (lower.includes('email') && lower.includes('already')) {
    return formatOAuthAuthError(raw, { code, provider: 'apple' });
  }
  return detail
    ? `Apple sign-in failed (${detail}). If Google works, add com.socaloffroaders.app to Supabase Apple Client IDs.`
    : 'Apple sign-in failed. Add com.socaloffroaders.app to Supabase → Apple → Client IDs.';
}

export type AppleNativeAuthMode = 'signIn' | 'link';

/** Native iOS Sign in with Apple → sign-in or link to the current session. */
export async function appleNativeAuth(
  supabase: SupabaseClient,
  mode: AppleNativeAuthMode
): Promise<{ error: string | null }> {
  try {
    const rawNonce = randomNonce();

    // Capawesome hashes the nonce for Apple internally — pass raw, not SHA-256 hex.
    const result = await AppleSignIn.signIn({
      nonce: rawNonce,
      scopes: [SignInScope.Email, SignInScope.FullName],
    });

    if (!result.idToken) {
      return { error: 'Apple sign-in did not return an identity token.' };
    }

    // Do not pass `nonce` to Supabase: hosted GoTrue compares hex vs Apple's base64url
    // nonce claim and returns "Nonces mismatch" even with correct Client IDs.
    // Apple still validates nonce in the ID token; Supabase verifies JWT signature + aud.
    const credentials = {
      provider: 'apple' as const,
      token: result.idToken,
    };

    const { error } =
      mode === 'link'
        ? await supabase.auth.linkIdentity(credentials)
        : await supabase.auth.signInWithIdToken(credentials);

    if (error) {
      const raw = error.message ?? '';
      const errCode = (error as { code?: string }).code ?? '';
      if (raw.toLowerCase().includes('invalid grant') || raw.toLowerCase().includes('code verifier')) {
        return {
          error:
            'Sign-in session expired. Close the app completely, reopen, and try again.',
        };
      }
      return {
        error: formatAppleSupabaseError(raw, errCode),
      };
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
