import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/verifyRequest';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const { supabaseAdmin } = auth;

  const [posts, users, clubs, unverifiedClubs, flagsPosts] = await Promise.all([
    supabaseAdmin.from('posts').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('clubs').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('clubs').select('id', { count: 'exact', head: true }).eq('verified', false),
    supabaseAdmin.from('post_flags').select('post_id', { count: 'exact', head: true }),
  ]);

  const safeCount = (r: { count: number | null; error: { message: string } | null | undefined }) =>
    r.error ? 0 : r.count ?? 0;

  return NextResponse.json({
    counts: {
      posts: safeCount(posts),
      users: safeCount(users),
      clubs: safeCount(clubs),
      clubsPendingVerification: safeCount(unverifiedClubs),
      postFlagRows: safeCount(flagsPosts),
    },
  });
}
