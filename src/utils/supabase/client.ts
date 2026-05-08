import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/utils/supabase/env';
import { supabaseCookieOptions } from '@/utils/supabase/cookieOptions';
import { isCapacitorNative } from '@/utils/capacitator/isNative';
import { capacitorAuthStorage } from '@/utils/supabase/capacitorStorage';

/** Browser client: cookie-backed session (pairs with root `middleware.ts`). */
export function createBrowserSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;
  try {
    // Capacitor native (Android/iOS): do NOT use cookie-backed SSR client.
    // OAuth runs in a separate browser context; cookies/PKCE state won't round-trip reliably.
    // Use the plain supabase-js client with persistent storage and complete PKCE via deep link.
    if (isCapacitorNative()) {
      return createClient(url, key, {
        auth: {
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storage: capacitorAuthStorage,
        },
      });
    }
    const secure =
      typeof window !== 'undefined' ? window.location.protocol === 'https:' : true;
    return createBrowserClient(url, key, {
      cookieOptions: supabaseCookieOptions(secure),
    });
  } catch {
    return null;
  }
}
