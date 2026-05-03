import type { SupabaseClient } from '@supabase/supabase-js';

const MISSING_COL_RE = /could not find the '([^']+)' column/i;

/** Postgres UUID v4 (and broader hex segments used by gen_random_uuid). */
export function isLikelyUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

export function parseMissingColumnMessage(message: string): string | null {
  const m = message.match(MISSING_COL_RE);
  return m?.[1] ?? null;
}

/**
 * Insert row into Supabase; if PostgREST reports an unknown column (PGRST204-style message),
 * remove that key and retry. Helps apps coexist with multiple DB drifted schemas.
 */
export async function insertAdaptive(
  client: SupabaseClient,
  table: string,
  initialRow: Record<string, unknown>
): Promise<{ error: { message: string; code?: string } | null }> {
  let row: Record<string, unknown> = { ...initialRow };
  let lastMsg = '';

  for (let i = 0; i < 28; i++) {
    const { error } = await client.from(table).insert(row);
    if (!error) return { error: null };

    lastMsg = error.message ?? '';
    const badCol = parseMissingColumnMessage(lastMsg);
    if (badCol && Object.prototype.hasOwnProperty.call(row, badCol)) {
      const next = { ...row };
      delete next[badCol];
      row = next;
      continue;
    }

    return { error: { message: lastMsg, code: error.code } };
  }

  return { error: { message: lastMsg || 'Too many insert retries (unknown columns)' } };
}
