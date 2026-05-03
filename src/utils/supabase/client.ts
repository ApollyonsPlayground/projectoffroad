import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/utils/supabase/env';
import { supabaseCookieOptions } from '@/utils/supabase/cookieOptions';

/** Browser client: cookie-backed session (pairs with root `middleware.ts`). */
export function createBrowserSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;
  try {
    const secure =
      typeof window !== 'undefined' ? window.location.protocol === 'https:' : true;
    return createBrowserClient(url, key, {
      cookieOptions: supabaseCookieOptions(secure),
    });
  } catch {
    return null;
  }
}
