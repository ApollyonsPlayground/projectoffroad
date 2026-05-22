import type { SupabaseClient } from '@supabase/supabase-js';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';

const IOS_BUNDLE_ID = 'com.socaloffroaders.app';
const SITE_CALLBACK = 'https://socaloffroaders.com/auth/callback/';

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

function isUserCancel(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('cancel') ||
    lower.includes('1001') ||
    lower.includes('authorization error')
  );
}

/** Native iOS Sign in with Apple → Supabase session via identity token. */
export async function signInWithAppleNative(
  supabase: SupabaseClient
): Promise<{ error: string | null }> {
  try {
    const rawNonce = randomNonce();
    const hashedNonce = await sha256Hex(rawNonce);

    const result = await SignInWithApple.authorize({
      clientId: IOS_BUNDLE_ID,
      redirectURI: SITE_CALLBACK,
      scopes: 'email name',
      state: rawNonce,
      nonce: hashedNonce,
    });

    const { identityToken, givenName, familyName } = result.response;
    if (!identityToken) {
      return { error: 'Apple sign-in did not return an identity token.' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
      nonce: rawNonce,
    });

    if (error) {
      const raw = error.message ?? '';
      if (raw.toLowerCase().includes('client') || raw.toLowerCase().includes('audience')) {
        return {
          error:
            'Apple sign-in rejected by Supabase. Dashboard → Authentication → Providers → Apple: enable and add com.socaloffroaders.app under Client IDs.',
        };
      }
      return { error: raw || 'Apple sign-in failed.' };
    }

    const fullName = [givenName, familyName].filter(Boolean).join(' ').trim();
    if (fullName) {
      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          given_name: givenName ?? undefined,
          family_name: familyName ?? undefined,
        },
      });
    }

    return { error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isUserCancel(msg)) return { error: null };
    return { error: msg || 'Apple sign-in failed.' };
  }
}
