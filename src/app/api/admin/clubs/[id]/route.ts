import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/verifyRequest';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const verified = typeof body.verified === 'boolean' ? body.verified : undefined;

  if (verified === undefined) {
    return NextResponse.json({ error: 'verified boolean required' }, { status: 400 });
  }

  const { data, error } = await auth.supabaseAdmin
    .from('clubs')
    .update({ verified })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
