import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/verifyRequest';

export const runtime = 'nodejs';

type PostRow = Record<string, unknown>;

function textBody(p: PostRow): string {
  for (const key of ['body', 'content', 'caption'] as const) {
    const v = p[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function denormalizedAuthor(p: PostRow): string {
  const n = String(p.user_name ?? p.username ?? '').trim();
  return n;
}

/** Same merge logic as the home feed so moderation sees real captions & names. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

  const { data, error } = await auth.supabaseAdmin
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as PostRow[];
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean).map(String))];

  const userById: Record<string, { name: string | null; email: string | null }> = {};
  if (userIds.length > 0) {
    const { data: userRows, error: userErr } = await auth.supabaseAdmin
      .from('users')
      .select('id, name, email')
      .in('id', userIds);
    if (!userErr && userRows) {
      for (const u of userRows as { id: string; name: string | null; email: string | null }[]) {
        userById[String(u.id)] = { name: u.name ?? null, email: u.email ?? null };
      }
    }
  }

  const posts = rows.map((p) => {
    const uid = p.user_id ? String(p.user_id) : '';
    const u = uid ? userById[uid] : undefined;
    const fromPost = denormalizedAuthor(p);
    const authorName =
      fromPost ||
      (u?.name != null && String(u.name).trim() ? String(u.name).trim() : '') ||
      (u?.email ? String(u.email).split('@')[0] : '') ||
      (uid ? 'Member' : 'Anonymous');

    const body = textBody(p);
    const imageUrl = p.image_url != null && String(p.image_url).trim() ? String(p.image_url).trim() : '';

    return {
      ...p,
      /** Normalized for admin UI (matches feed `body ?? content ?? caption`). */
      body: body || (imageUrl ? '(Image post — no caption)' : '(Empty post)'),
      user_name: authorName,
    };
  });

  return NextResponse.json({ posts });
}
