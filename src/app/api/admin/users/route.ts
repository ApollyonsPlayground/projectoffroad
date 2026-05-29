import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/verifyRequest';
import { escapePostgrestFilterValue } from '@/lib/api/security';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '40', 10), 100);

  let query = auth.supabaseAdmin
    .from('users')
    .select('id, email, name, role, avatar_url, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (q) {
    const safe = escapePostgrestFilterValue(q);
    query = query.or(`email.ilike.%${safe}%,name.ilike.%${safe}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ users: data ?? [] });
}
