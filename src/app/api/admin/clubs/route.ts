import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/verifyRequest';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const { data, error } = await auth.supabaseAdmin
    .from('clubs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ clubs: data ?? [] });
}
