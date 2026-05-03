import type { SupabaseClient } from '@supabase/supabase-js';

/** Persist resolved table names once per tab session to avoid repeated 404 probes in DevTools. */
const SOCIAL_SS_KEY = 'socaloffroaders_social_tables_v1';

type SocialPersist = {
  likes?: 'post_likes' | 'likes' | null;
  bookmarks?: 'saved_posts' | 'bookmarks' | null;
};

function readSocialPersist(): SocialPersist | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SOCIAL_SS_KEY);
    return raw ? (JSON.parse(raw) as SocialPersist) : null;
  } catch {
    return null;
  }
}

function writeSocialPersist(patch: SocialPersist) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const prev = readSocialPersist() ?? {};
    sessionStorage.setItem(SOCIAL_SS_KEY, JSON.stringify({ ...prev, ...patch }));
  } catch {
    /* quota / private mode */
  }
}

function relationMissing(err: { message?: string; code?: string; details?: string } | null): boolean {
  if (!err) return false;
  const msg = `${err.message ?? ''} ${err.details ?? ''}`.toLowerCase();
  const code = String(err.code ?? '');
  return (
    code === '404' ||
    code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table')
  );
}

let likesTableCache: 'post_likes' | 'likes' | null | undefined;
let bookmarksTableCache: 'saved_posts' | 'bookmarks' | null | undefined;

export async function resolveLikesTable(client: SupabaseClient): Promise<'post_likes' | 'likes' | null> {
  if (likesTableCache !== undefined) return likesTableCache;
  const persisted = readSocialPersist();
  if (persisted && Object.prototype.hasOwnProperty.call(persisted, 'likes')) {
    likesTableCache = persisted.likes ?? null;
    return likesTableCache;
  }
  const a = await client.from('post_likes').select('post_id').limit(1);
  if (!a.error) {
    likesTableCache = 'post_likes';
    writeSocialPersist({ likes: likesTableCache });
    return likesTableCache;
  }
  if (!relationMissing(a.error)) {
    likesTableCache = null;
    writeSocialPersist({ likes: null });
    return null;
  }
  const b = await client.from('likes').select('post_id').limit(1);
  if (!b.error) {
    likesTableCache = 'likes';
    writeSocialPersist({ likes: likesTableCache });
    return likesTableCache;
  }
  likesTableCache = null;
  writeSocialPersist({ likes: null });
  return null;
}

export async function resolveBookmarksTable(client: SupabaseClient): Promise<'saved_posts' | 'bookmarks' | null> {
  if (bookmarksTableCache !== undefined) return bookmarksTableCache;
  const persisted = readSocialPersist();
  if (persisted && Object.prototype.hasOwnProperty.call(persisted, 'bookmarks')) {
    bookmarksTableCache = persisted.bookmarks ?? null;
    return bookmarksTableCache;
  }
  const a = await client.from('saved_posts').select('post_id').limit(1);
  if (!a.error) {
    bookmarksTableCache = 'saved_posts';
    writeSocialPersist({ bookmarks: bookmarksTableCache });
    return bookmarksTableCache;
  }
  if (!relationMissing(a.error)) {
    bookmarksTableCache = null;
    writeSocialPersist({ bookmarks: null });
    return null;
  }
  const b = await client.from('bookmarks').select('post_id').limit(1);
  if (!b.error) {
    bookmarksTableCache = 'bookmarks';
    writeSocialPersist({ bookmarks: bookmarksTableCache });
    return bookmarksTableCache;
  }
  bookmarksTableCache = null;
  writeSocialPersist({ bookmarks: null });
  return null;
}

export async function fetchLikedPostIdRows(
  client: SupabaseClient,
  userId: string
): Promise<{ post_id: string }[]> {
  const table = await resolveLikesTable(client);
  if (!table) return [];
  const r = await client.from(table).select('post_id').eq('user_id', userId);
  if (r.error) return [];
  return (r.data ?? []) as { post_id: string }[];
}

/** Recent liked post ids (newest first when `created_at` exists on the likes row). */
export async function fetchLikedPostIdsRecent(
  client: SupabaseClient,
  userId: string,
  limit = 30
): Promise<string[]> {
  const table = await resolveLikesTable(client);
  if (!table) return [];
  const ordered = await client
    .from(table)
    .select('post_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (!ordered.error && ordered.data?.length) {
    return (ordered.data as { post_id: string }[]).map((r) => r.post_id);
  }
  const plain = await client.from(table).select('post_id').eq('user_id', userId).limit(limit);
  if (plain.error || !plain.data?.length) return [];
  return (plain.data as { post_id: string }[]).map((r) => r.post_id);
}

export async function fetchSavedPostIdRows(
  client: SupabaseClient,
  userId: string
): Promise<{ post_id: string }[]> {
  const table = await resolveBookmarksTable(client);
  if (!table) return [];
  const r = await client.from(table).select('post_id').eq('user_id', userId);
  if (r.error) return [];
  return (r.data ?? []) as { post_id: string }[];
}

export async function fetchSavedPostIdsRecent(
  client: SupabaseClient,
  userId: string,
  limit = 30
): Promise<string[]> {
  const table = await resolveBookmarksTable(client);
  if (!table) return [];
  const ordered = await client
    .from(table)
    .select('post_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (!ordered.error && ordered.data?.length) {
    return (ordered.data as { post_id: string }[]).map((r) => r.post_id);
  }
  const plain = await client.from(table).select('post_id').eq('user_id', userId).limit(limit);
  if (plain.error || !plain.data?.length) return [];
  return (plain.data as { post_id: string }[]).map((r) => r.post_id);
}

/** IDs of posts the user reposted (original post ids when `repost_of_id` exists). */
export async function fetchUserRepostedOriginalIds(
  client: SupabaseClient,
  userId: string
): Promise<string[]> {
  // Avoid `select=repost_of_id` — column may be missing (400). Always use full rows.
  const wide = await client.from('posts').select('*').eq('user_id', userId).limit(300);
  if (wide.error || !wide.data) return [];
  return [
    ...new Set(
      (wide.data as { repost_of_id?: string | null }[])
        .map((r) => r.repost_of_id)
        .filter((x): x is string => !!x)
    ),
  ];
}

export async function insertPostLike(
  client: SupabaseClient,
  userId: string,
  postId: string
): Promise<{ error: { message?: string; code?: string } | null }> {
  const table = await resolveLikesTable(client);
  if (!table) return { error: { message: 'No likes table (post_likes or likes)' } };
  const { error } = await client.from(table).insert({ post_id: postId, user_id: userId });
  return { error };
}

export async function deletePostLike(
  client: SupabaseClient,
  userId: string,
  postId: string
): Promise<{ error: { message?: string; code?: string } | null }> {
  const table = await resolveLikesTable(client);
  if (!table) return { error: { message: 'No likes table (post_likes or likes)' } };
  const { error } = await client.from(table).delete().match({ post_id: postId, user_id: userId });
  return { error };
}

export async function insertSavedPost(
  client: SupabaseClient,
  userId: string,
  postId: string
): Promise<{ error: { message?: string; code?: string } | null }> {
  const table = await resolveBookmarksTable(client);
  if (!table) return { error: { message: 'No bookmarks table (saved_posts or bookmarks)' } };
  const { error } = await client.from(table).insert({ post_id: postId, user_id: userId });
  return { error };
}

export async function deleteSavedPost(
  client: SupabaseClient,
  userId: string,
  postId: string
): Promise<{ error: { message?: string; code?: string } | null }> {
  const table = await resolveBookmarksTable(client);
  if (!table) return { error: { message: 'No bookmarks table (saved_posts or bookmarks)' } };
  const { error } = await client.from(table).delete().match({ post_id: postId, user_id: userId });
  return { error };
}

export async function fetchPostsByIds(client: SupabaseClient, ids: string[]): Promise<any[]> {
  if (ids.length === 0) return [];
  const { data, error } = await client.from('posts').select('*').in('id', ids);
  if (error || !data) return [];
  return data;
}
