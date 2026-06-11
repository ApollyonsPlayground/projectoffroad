'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Link2, Loader2, RefreshCw, Share2, UserPlus, XCircle } from 'lucide-react';
import { useToast } from '@/components/Toast';
import {
  buildGuestInviteUrl,
  createGuestInvite,
  fetchGuestInviteStatus,
  revokeGuestInvite,
  type GuestInviteStatus,
} from '@/lib/runs/guestInvite';
import type { SupabaseClient } from '@supabase/supabase-js';

type Props = {
  runId: string;
  supabaseClient: SupabaseClient;
  maxParticipants: number | null;
  participantCount: number;
  guestCount: number;
};

export function RunGuestInvitePanel({
  runId,
  supabaseClient,
  maxParticipants,
  participantCount,
  guestCount,
}: Props) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<GuestInviteStatus>({ active: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [maxGuests, setMaxGuests] = useState(5);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const remainingCapacity = maxParticipants != null
    ? Math.max(0, maxParticipants - participantCount - guestCount)
    : 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchGuestInviteStatus(supabaseClient, runId);
      setStatus(s);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not load invites', 'error');
    } finally {
      setLoading(false);
    }
  }, [supabaseClient, runId, showToast]);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async (regenerate = false) => {
    if (remainingCapacity <= 0) {
      showToast('Run is at capacity', 'info');
      return;
    }
    const cap = Math.min(Math.max(1, maxGuests), remainingCapacity, 50);
    setBusy(true);
    try {
      if (regenerate && status.active) await revokeGuestInvite(supabaseClient, runId);
      const result = await createGuestInvite(supabaseClient, runId, cap);
      const url = buildGuestInviteUrl(runId, result.token);
      setLastUrl(url);
      await load();
      showToast(regenerate ? 'New guest link created' : 'Guest link ready', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not create invite', 'error');
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied', 'success');
    } catch {
      showToast('Could not copy link', 'error');
    }
  };

  const shareUrl = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join my run', text: 'Guest invite — no account needed', url });
        return;
      } catch { /* cancelled */ }
    }
    await copyUrl(url);
  };

  const handleRevoke = async () => {
    setBusy(true);
    try {
      await revokeGuestInvite(supabaseClient, runId);
      setLastUrl(null);
      await load();
      showToast('Guest link revoked', 'info');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not revoke', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <UserPlus size={16} className="text-primary" />
        <p className="text-[13px] font-bold text-foreground">Invite guests (no account)</p>
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed">
        Share a link so friends can pick a temporary trail name and use run chat, live map, and SOS until the run ends.
      </p>

      <div className="flex items-center gap-2">
        <label className="text-[11px] text-muted-foreground shrink-0" htmlFor="max-guests">Max guests</label>
        <input
          id="max-guests"
          type="number"
          min={1}
          max={Math.min(50, remainingCapacity || 1)}
          value={maxGuests}
          onChange={(e) => setMaxGuests(parseInt(e.target.value, 10) || 1)}
          className="w-20 px-2 py-1.5 rounded-lg bg-muted border border-border text-sm"
        />
        <span className="text-[11px] text-muted-foreground">({remainingCapacity} spots left on run)</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>
      ) : (
        <>
          {status.active ? (
            <p className="text-[12px] text-muted-foreground">
              <Link2 size={12} className="inline mr-1" />
              {status.redemption_count ?? 0} / {status.max_redemptions ?? 0} guests joined via link
            </p>
          ) : (
            <p className="text-[12px] text-muted-foreground">No active guest link yet.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCreate(status.active)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : status.active ? <RefreshCw size={14} /> : <Link2 size={14} />}
              {status.active ? 'Regenerate link' : 'Create link'}
            </button>
            {status.active ? (
              <button type="button" disabled={busy} onClick={() => void handleRevoke()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-bold text-muted-foreground">
                <XCircle size={14} /> Revoke
              </button>
            ) : null}
          </div>

          {lastUrl ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => void copyUrl(lastUrl)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <Copy size={14} /> Copy new link
              </button>
              <button type="button" onClick={() => void shareUrl(lastUrl)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <Share2 size={14} /> Share
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
