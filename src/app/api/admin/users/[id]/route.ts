import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/admin/verifyRequest';

export const runtime = 'nodejs';

const ALLOWED_ROLES = new Set(['user', 'admin', 'owner']);

/**
 * Owner-only: change another user's role (promote/demote admins).
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner(request);
  if (auth instanceof Response) return auth;

  const { id } = await ctx.params;
  if (id === auth.user.id) {
    return NextResponse.json({ error: 'Cannot change your own role here' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const role = typeof body.role === 'string' ? body.role.trim().toLowerCase() : '';

  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const { data, error } = await auth.supabaseAdmin
    .from('users')
    .update({ role })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
