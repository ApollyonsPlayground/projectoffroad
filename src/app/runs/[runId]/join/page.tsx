'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, MapPin, Calendar, Users, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import {
  previewGuestInvite,
  redeemGuestInvite,
  validateGuestDisplayName,
  type GuestInvitePreview,
} from '@/lib/runs/guestInvite';

export default function RunGuestJoinPage() {
  const params = useParams<{ runId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { supabaseClient, user, loading: authLoading, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const runId = useMemo(() => {
    const raw = params?.runId;
    return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';
  }, [params?.runId]);

  const token = searchParams?.get('token')?.trim() ?? '';

  const [preview, setPreview] = useState<GuestInvitePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [trailName, setTrailName] = useState('');
  const [acceptedRisk, setAcceptedRisk] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedAge, setAcceptedAge] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!supabaseClient || !token) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setPreviewLoading(true);
      try {
        const p = await previewGuestInvite(supabaseClient, token);
        if (!cancelled) setPreview(p);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [supabaseClient, token]);

  const canSubmit =
    Boolean(token && trailName.trim() && acceptedRisk && acceptedTerms && acceptedAge && preview) &&
    (preview?.spots_remaining ?? 0) > 0;

  const handleJoin = async () => {
    if (!supabaseClient || !token || !preview) return;
    const nameErr = validateGuestDisplayName(trailName);
    if (nameErr) { showToast(nameErr, 'error'); return; }

    setJoining(true);
    try {
      if (!user) {
        const { error: anonErr } = await supabaseClient.auth.signInAnonymously();
        if (anonErr) throw anonErr;
      }
      const result = await redeemGuestInvite(supabaseClient, token, trailName.trim());
      await refreshProfile();
      showToast(`You joined as ${result.display_name ?? trailName.trim()}.`, 'success');
      router.replace(`/runs/${result.run_id}/`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not join run', 'error');
    } finally {
      setJoining(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <p className="text-muted-foreground text-center">Missing invite link.</p>
      </div>
    );
  }

  if (previewLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <p className="text-muted-foreground text-center">Invite not valid or expired.</p>
      </div>
    );
  }

  const runDate = new Date(preview.date).toLocaleString();

  return (
    <div className="min-h-screen bg-background pb-safe-nav">
      <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
        <h1 className="text-2xl font-black">{preview.title}</h1>
        <p className="text-sm text-muted-foreground">Guest join — temporary trail name, access until run ends.</p>
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-sm text-muted-foreground">
          <div className="flex gap-2"><Calendar size={16} className="text-primary" /><span>{runDate}</span></div>
          {preview.meetup_location ? <div className="flex gap-2"><MapPin size={16} className="text-primary" /><span>{preview.meetup_location}</span></div> : null}
          <div className="flex gap-2"><Users size={16} className="text-primary" /><span>{preview.spots_remaining} spots left</span></div>
        </div>
        <input value={trailName} onChange={(e) => setTrailName(e.target.value)} maxLength={24} placeholder="Trail name" className="w-full px-4 py-3 rounded-xl bg-muted border border-border" />
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={acceptedRisk} onChange={(e) => setAcceptedRisk(e.target.checked)} />I accept off-road risks.</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />I agree to <Link href="/terms/" className="text-primary underline">Terms</Link> and <Link href="/privacy/" className="text-primary underline">Privacy</Link>.</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={acceptedAge} onChange={(e) => setAcceptedAge(e.target.checked)} />I am at least 13.</label>
        <button type="button" disabled={!canSubmit || joining} onClick={() => void handleJoin()} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black disabled:opacity-50">{joining ? 'Joining…' : 'Join as guest'}</button>
      </div>
    </div>
  );
}
