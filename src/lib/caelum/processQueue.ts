import type { SupabaseClient } from '@supabase/supabase-js';
import { deliverCaelumReply } from '@/lib/caelum/chatDeliver';

export type CaelumQueueRow = {
  id: string;
  message: string;
  user_id: string | null;
  user_name: string | null;
  current_page: string | null;
};

/**
 * Claims pending rows (pending → processing), calls webhook, writes reply + done/failed.
 * Safe under overlapping cron: update … where status=pending only succeeds once per row.
 */
export async function processCaelumQueueBatch(admin: SupabaseClient, limit = 15): Promise<{ processed: number }> {
  const { data: rows, error } = await admin
    .from('caelum_chat_queue')
    .select('id, message, user_id, user_name, current_page')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  let processed = 0;

  for (const row of (rows ?? []) as CaelumQueueRow[]) {
    const { data: claimed, error: claimErr } = await admin
      .from('caelum_chat_queue')
      .update({ status: 'processing' })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (claimErr || !claimed) continue;

    processed += 1;

    const context = {
      currentPage: row.current_page ?? undefined,
      userId: row.user_id ?? undefined,
      userName: row.user_name ?? undefined,
    };

    try {
      const { reply } = await deliverCaelumReply({
        message: row.message,
        context,
        signal: AbortSignal.timeout(27_000),
      });

      await admin
        .from('caelum_chat_queue')
        .update({ reply, status: 'done' })
        .eq('id', row.id)
        .eq('status', 'processing');
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error';
      await admin
        .from('caelum_chat_queue')
        .update({
          reply: `Couldn’t reach Caelum right now (${errMsg.slice(0, 240)}). Try again soon.`,
          status: 'failed',
        })
        .eq('id', row.id)
        .eq('status', 'processing');
    }
  }

  return { processed };
}
