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

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
    lower.includes('authorization error')
  );
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

    const result = await AppleSignIn.signIn({
      nonce: hashedNonce,
      scopes: [SignInScope.Email, SignInScope.FullName],
    });

    if (!result.idToken) {
      return { error: 'Apple sign-in did not return an identity token.' };
    }

    const credentials = {
      provider: 'apple' as const,
      token: result.idToken,
      nonce: rawNonce,
    };

    const { error } =
      mode === 'link'
        ? await supabase.auth.linkIdentity(credentials)
        : await supabase.auth.signInWithIdToken(credentials);

    if (error) {
      const raw = error.message ?? '';
      if (raw.toLowerCase().includes('client') || raw.toLowerCase().includes('audience')) {
        return {
          error:
            'Apple sign-in rejected by Supabase. Dashboard → Authentication → Providers → Apple: enable and add com.socaloffroaders.app under Client IDs.',
        };
      }
      return {
        error: formatOAuthAuthError(raw, {
          code: (error as { code?: string }).code,
          provider: 'apple',
          linking: mode === 'link',
        }),
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
