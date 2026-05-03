import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/utils/supabase/env';

export type AdminRole = 'owner' | 'admin';

export interface VerifiedAdmin {
  user: User;
  role: string;
  supabaseAdmin: SupabaseClient;
}

/**
 * Verifies Bearer JWT and that users.role is owner or admin.
 * Uses service role client only after auth succeeds.
 */
export async function requireAdmin(request: Request): Promise<VerifiedAdmin | Response> {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    return Response.json({ error: 'Server misconfigured (missing Supabase env)' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const anon = createClient(url, anonKey);
  const { data: userData, error: authErr } = await anon.auth.getUser(token);
  if (authErr || !userData.user) {
    return Response.json({ error: 'Invalid session' }, { status: 401 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error: profileErr } = await admin
    .from('users')
    .select('*')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileErr) {
    return Response.json({ error: profileErr.message }, { status: 500 });
  }

  const role = String(row?.role ?? '').toLowerCase();
  if (role !== 'owner' && role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { user: userData.user, role, supabaseAdmin: admin };
}

export async function requireOwner(request: Request): Promise<VerifiedAdmin | Response> {
  const res = await requireAdmin(request);
  if (res instanceof Response) return res;
  if (res.role !== 'owner') {
    return Response.json({ error: 'Owner only' }, { status: 403 });
  }
  return res;
}
