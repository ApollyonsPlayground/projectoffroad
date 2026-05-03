import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/verifyRequest';

export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const { id } = await ctx.params;

  const { error } = await auth.supabaseAdmin.from('posts').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const hidden = typeof body.hidden === 'boolean' ? body.hidden : undefined;

  if (hidden === undefined) {
    return NextResponse.json({ error: 'hidden boolean required' }, { status: 400 });
  }

  const { data, error } = await auth.supabaseAdmin
    .from('posts')
    .update({ hidden })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
