import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/utils/supabase/env';
import {
  hostnameLooksLikePrivateLan,
  supabaseCookieOptions,
} from '@/utils/supabase/cookieOptions';

/**
 * Server Components / Route Handlers: reads Supabase auth cookies set by middleware + browser client.
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient | null> {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;

  const cookieStore = await cookies();
  const headerList = await headers();
  const proto = headerList.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  let secure: boolean;
  if (proto === 'http' || proto === 'https') {
    secure = proto === 'https';
  } else {
    const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? '';
    secure = !hostnameLooksLikePrivateLan(host) && process.env.NODE_ENV === 'production';
  }

  return createServerClient(url, key, {
    cookieOptions: supabaseCookieOptions(secure),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* Server Component — middleware refreshes session */
        }
      },
    },
  });
}
