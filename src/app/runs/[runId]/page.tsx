'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Mountain,
  CheckCircle2,
  Loader2,
  Zap,
  Navigation,
  Shield,
  AlertTriangle,
  Play,
  User,
  Building2,
  BadgeCheck,
  Flag,
  Siren,
  X,
  Send,
  MessageCircle,
  Ban,
  Trash2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { snapshotPublicIdentity } from '@/lib/profileDisplay';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RunTrailEmbed {
  name: string;
  difficulty: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coordinates?: string | null;
}

interface RunDetail {
  id: string;
  title: string;
  description: string | null;
  date: string;
  meetup_location: string | null;
  meetup_latitude?: number | null;
  meetup_longitude?: number | null;
  difficulty: string;
  max_participants: number | null;
  vehicle_requirements: string | null;
  status: string;
  host_id: string | null;
  club_id: string | null;
  trail_id: string | null;
  run_source: 'club_official' | 'user_submitted' | null;
  user_acknowledged_disclaimer_at: string | null;
  created_at: string;
  club: { name: string; logo: string | null } | null;
  trail: RunTrailEmbed | null;
}

interface HostProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

interface Participant {
  id: string;
  user_id: string;
  rsvp_status: string;
  users: {
    name: string | null;
    avatar_url: string | null;
  } | null;
}

interface RunAlert {
  id: string;
  run_id: string;
  user_id: string;
  user_name: string | null;
  latitude: number | null;
  longitude: number | null;
  message: string | null;
  created_at: string;
}

interface RunChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  users?: { name: string | null; avatar_url: string | null } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDifficultyColor(d: string) {
  const level = (d ?? '').toLowerCase();
  if (level === 'beginner' || level === 'easy')
    return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
  if (level === 'moderate' || level === 'intermediate')
    return 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30';
  if (level === 'advanced' || level === 'challenging')
    return 'bg-orange-500/15 text-orange-400 border border-orange-500/30';
  if (level === 'extreme')
    return 'bg-red-500/15 text-red-400 border border-red-500/30';
  return 'bg-zinc-700/50 text-zinc-400';
}

function formatRunDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) + ' at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getStatusBadge(status: string) {
  if (status === 'active')
    return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
  if (status === 'completed')
    return 'bg-zinc-700/50 text-zinc-400';
  return 'bg-orange-500/15 text-orange-400 border border-orange-500/30';
}

function coordsFromTrailEmbed(trail: RunTrailEmbed | null): { lat: number; lng: number } | null {
  if (!trail) return null;
  const latRaw = trail.latitude ?? null;
  const lngRaw = trail.longitude ?? null;
  if (latRaw != null && lngRaw != null) {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
  }
  const coordStr = trail.coordinates;
  if (typeof coordStr === 'string' && coordStr.trim()) {
    const parts = coordStr.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
  }
  return null;
}

function googleDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function runTrailDirectionsUrl(run: RunDetail): string | null {
  const c = coordsFromTrailEmbed(run.trail);
  return c ? googleDirectionsUrl(c.lat, c.lng) : null;
}

function runStagingDirectionsUrl(run: RunDetail): string | null {
  const lat = run.meetup_latitude != null ? Number(run.meetup_latitude) : NaN;
  const lng = run.meetup_longitude != null ? Number(run.meetup_longitude) : NaN;
  if (!Number.isNaN(lat) && !Number.isNaN(lng)) return googleDirectionsUrl(lat, lng);
  return null;
}

// ─── Detail Page ──────────────────────────────────────────────────────────────

export default function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();
  const { user, supabaseClient } = useAuth();
  const { showToast } = useToast();

  const [run, setRun] = useState<RunDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [activating, setActivating] = useState(false);
  const [hostBusy, setHostBusy] = useState<'complete' | 'cancel' | 'delete' | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);

  const [chatMessages, setChatMessages] = useState<RunChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // SOS state
  const [sosSending, setSosSending] = useState(false);
  const [sosCancelId, setSosCancelId] = useState<string | null>(null);
  const [sosConfirmOpen, setSosConfirmOpen] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<RunAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const fetchDetail = useCallback(async () => {
    if (!supabaseClient || !runId) return;
    setIsLoading(true);
    setHostProfile(null);
    try {
      const runSelectAttempts = [
        '*',
        'id, title, description, date, meetup_location, meetup_latitude, meetup_longitude, difficulty, max_participants, vehicle_requirements, status, host_id, club_id, trail_id, run_source, user_acknowledged_disclaimer_at, created_at',
        'id, title, description, date, meetup_location, difficulty, max_participants, vehicle_requirements, status, host_id, club_id, trail_id, run_source, created_at, club:clubs(name), trail:trails(name, difficulty)',
        'id, title, description, date, meetup_location, meetup_latitude, meetup_longitude, difficulty, max_participants, vehicle_requirements, status, host_id, club_id, trail_id, run_source, user_acknowledged_disclaimer_at, created_at, club:clubs(name, logo), trail:trails(name, difficulty, latitude, longitude, coordinates)',
      ];

      let runPayload: unknown = null;
      let lastRunError: { message?: string } | null = null;
      for (const sel of runSelectAttempts) {
        const { data, error } = await supabaseClient.from('runs').select(sel).eq('id', runId).single();
        if (!error) {
          runPayload = data;
          break;
        }
        lastRunError = error;
      }

      const participantsRes = await supabaseClient
        .from('run_participants')
        .select('id, user_id, rsvp_status, users(name, avatar_url)')
        .eq('run_id', runId);

      if (runPayload == null) throw lastRunError ?? new Error('Run not found');
      const loaded = runPayload as RunDetail;
      setRun(loaded);
      const hid = loaded.host_id;
      if (hid) {
        const { data: hp } = await supabaseClient
          .from('users')
          .select('id, name, avatar_url')
          .eq('id', hid)
          .maybeSingle();
        setHostProfile(hp as HostProfile | null);
      }
      const parts = (participantsRes.data ?? []) as unknown as Participant[];
      setParticipants(parts);
      if (user) {
        setJoined(parts.some((p) => p.user_id === user.id));
      }
    } catch {
      showToast('Could not load run', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, runId, user, showToast]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // ── RSVP ────────────────────────────────────────────────────────────────────
  const handleRsvp = async () => {
    if (!user) { showToast('Sign in to join a run', 'info'); return; }
    if (!supabaseClient || !run) return;
    if (user.id === run.host_id) {
      showToast('You\'re hosting this run — no need to join', 'info');
      return;
    }
    setJoining(true);
    try {
      if (joined) {
        const { error } = await supabaseClient
          .from('run_participants')
          .delete()
          .match({ run_id: run.id, user_id: user.id });
        if (error) {
          showToast(error.message || 'Could not leave run', 'error');
          return;
        }
        setJoined(false);
        setParticipants((prev) => prev.filter((p) => p.user_id !== user.id));
        showToast('Left the run', 'info');
      } else {
        const { error } = await supabaseClient
          .from('run_participants')
          .insert({ run_id: run.id, user_id: user.id, rsvp_status: 'going' });
        if (error && error.code !== '23505') {
          showToast(error.message || 'Could not join run', 'error');
          return;
        }
        setJoined(true);
        setParticipants((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            user_id: user.id,
            rsvp_status: 'going',
            users: {
              name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'You',
              avatar_url: (user.user_metadata?.avatar_url as string) || null,
            },
          },
        ]);
        showToast(`You're in for "${run.title}"!`, 'success');
      }
    } finally {
      setJoining(false);
    }
  };

  // ── Activate run (host only) ─────────────────────────────────────────────
  const handleActivate = async () => {
    if (!supabaseClient || !run) return;
    setActivating(true);
    try {
      const { error } = await supabaseClient
        .from('runs')
        .update({ status: 'active' })
        .eq('id', run.id);
      if (error) throw error;
      setRun((prev) => prev ? { ...prev, status: 'active' } : prev);
      showToast('Run is now active!', 'success');
    } catch {
      showToast('Could not activate run', 'error');
    } finally {
      setActivating(false);
    }
  };

  const handleCompleteRun = async () => {
    if (!supabaseClient || !run || !user) return;
    setHostBusy('complete');
    try {
      const { error } = await supabaseClient
        .from('runs')
        .update({ status: 'completed' })
        .eq('id', run.id);
      if (error) throw error;
      setRun((prev) => (prev ? { ...prev, status: 'completed' } : prev));
      showToast('Run marked complete. Thanks for leading!', 'success');
    } catch {
      showToast('Could not complete run', 'error');
    } finally {
      setHostBusy(null);
    }
  };

  const handleCancelRun = async () => {
    if (!supabaseClient || !run || !user) return;
    if (!window.confirm('Cancel this run? It will show as cancelled for all riders.')) return;
    setHostBusy('cancel');
    try {
      const { error } = await supabaseClient
        .from('runs')
        .update({ status: 'cancelled' })
        .eq('id', run.id);
      if (error) throw error;
      setRun((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
      showToast('Run cancelled', 'info');
    } catch {
      showToast('Could not cancel run', 'error');
    } finally {
      setHostBusy(null);
    }
  };

  const handleDeleteRun = async () => {
    if (!supabaseClient || !run || !user) return;
    if (
      !window.confirm(
        'Permanently delete this run from the platform? RSVPs and group chat for this event will be removed. This cannot be undone.'
      )
    ) {
      return;
    }
    setHostBusy('delete');
    try {
      const { error } = await supabaseClient.from('runs').delete().eq('id', run.id);
      if (error) throw error;
      showToast('Run deleted', 'success');
      router.push('/runs');
    } catch {
      showToast('Could not delete run', 'error');
    } finally {
      setHostBusy(null);
    }
  };

  // ── SOS: fetch existing alerts + subscribe to new ones ──────────────────────
  useEffect(() => {
    if (!supabaseClient || !runId) return;

    // Fetch any existing SOS alerts from the last 2 hours
    supabaseClient
      .from('sos_alerts')
      .select('*')
      .eq('run_id', runId)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) setActiveAlerts(data as RunAlert[]);
      });

    // Subscribe to new SOS alerts + cancellations (DELETE) in realtime
    const channel = supabaseClient
      .channel(`sos-alerts-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sos_alerts',
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          const alert = payload.new as RunAlert;
          setActiveAlerts((prev) => [alert, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'sos_alerts',
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          const oldRow = payload.old as { id?: string };
          if (oldRow?.id) {
            setActiveAlerts((prev) => prev.filter((a) => a.id !== oldRow.id));
            setDismissedAlerts((prev) => {
              const next = new Set(prev);
              next.delete(oldRow.id!);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => { supabaseClient.removeChannel(channel); };
  }, [supabaseClient, runId]);

  // ── SOS: send alert with current GPS coords ──────────────────────────────────
  const handleSendSOS = async () => {
    if (!user || !supabaseClient || !run) return;
    setSosSending(true);
    setSosConfirmOpen(false);

    const userName = snapshotPublicIdentity(profile ?? undefined, user);

    try {
      // Grab browser GPS
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );

      const { latitude, longitude } = position.coords;

      const { error } = await supabaseClient.from('sos_alerts').insert({
        run_id: run.id,
        user_id: user.id,
        user_name: userName,
        latitude,
        longitude,
        message: `${userName} needs assistance on ${run.title}.`,
      });

      if (error) throw error;
      showToast('SOS alert sent to all riders in this run.', 'success');
    } catch (err: any) {
      if (err?.code === 1) {
        // PERMISSION_DENIED — fall back to alert without coords
        const { error } = await supabaseClient.from('sos_alerts').insert({
          run_id: run.id,
          user_id: user.id,
          user_name: userName,
          latitude: null,
          longitude: null,
          message: `${userName} needs assistance on ${run.title}. (Location unavailable)`,
        });
        if (!error) {
          showToast('SOS sent — could not get your location. Enable GPS and try again.', 'info');
        } else {
          showToast('Could not send SOS alert.', 'error');
        }
      } else {
        showToast('Could not send SOS alert. Check your connection.', 'error');
      }
    } finally {
      setSosSending(false);
    }
  };

  const handleCancelOwnSOS = async (alertId: string) => {
    if (!supabaseClient || !user) return;
    setSosCancelId(alertId);
    try {
      const { error } = await supabaseClient.from('sos_alerts').delete().eq('id', alertId).eq('user_id', user.id);
      if (error) throw error;
      setActiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
      setDismissedAlerts((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
      showToast('SOS alert cancelled for everyone on this run.', 'success');
    } catch {
      showToast('Could not cancel SOS. Try again.', 'error');
    } finally {
      setSosCancelId(null);
    }
  };

  const isHost = Boolean(user && run && user.id === run.host_id);
  const canUseRunChat = Boolean(
    user &&
      run &&
      (joined || user.id === run.host_id) &&
      run.status !== 'completed' &&
      run.status !== 'cancelled'
  );
  const showSOSButton = Boolean(canUseRunChat && run?.status === 'active');

  const enrichChatRow = useCallback(
    (row: RunChatMessage): RunChatMessage => {
      if (row.users?.name) return row;
      const fromPart = participants.find((p) => p.user_id === row.user_id)?.users;
      if (fromPart) return { ...row, users: fromPart };
      if (user && row.user_id === user.id) {
        return {
          ...row,
          users: {
            name:
              (user.user_metadata?.full_name as string) ||
              user.email?.split('@')[0] ||
              'You',
            avatar_url: (user.user_metadata?.avatar_url as string) || null,
          },
        };
      }
      return { ...row, users: { name: 'Rider', avatar_url: null } };
    },
    [participants, user]
  );

  useEffect(() => {
    if (!supabaseClient || !runId || !run || !user || !canUseRunChat) return;

    let cancelled = false;
    void (async () => {
      const attempts = [
        'id, content, created_at, user_id, users(name, avatar_url)',
        'id, content, created_at, user_id',
      ];
      for (const sel of attempts) {
        const { data, error } = await supabaseClient
          .from('messages')
          .select(sel)
          .eq('run_id', runId)
          .order('created_at', { ascending: true })
          .limit(120);
        if (!error && data != null && !cancelled) {
          setChatMessages((data as RunChatMessage[]).map((m) => enrichChatRow(m)));
          break;
        }
      }
    })();

    const channel = supabaseClient
      .channel(`run-chat-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          const row = payload.new as RunChatMessage;
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, enrichChatRow(row)];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabaseClient.removeChannel(channel);
    };
  }, [supabaseClient, runId, run?.id, run?.status, run?.host_id, user?.id, canUseRunChat, enrichChatRow]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const handleSendChat = async () => {
    if (!supabaseClient || !run || !user || !canUseRunChat) return;
    const text = chatInput.trim();
    if (!text) return;
    setChatSending(true);
    try {
      const { data, error } = await supabaseClient
        .from('messages')
        .insert({ run_id: run.id, user_id: user.id, content: text })
        .select('id, content, created_at, user_id')
        .single();
      if (error) throw error;
      setChatInput('');
      const row = enrichChatRow(data as RunChatMessage);
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === row.id)) return prev;
        return [...prev, row];
      });
    } catch {
      showToast('Could not send message', 'error');
    } finally {
      setChatSending(false);
    }
  };

  const isFull = run?.max_participants != null && participants.length >= run.max_participants;

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-orange-500" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-3 text-center px-6">
        <Flag size={36} className="text-zinc-700" />
        <p className="text-white font-bold text-[16px]">Run not found</p>
        <button
          onClick={() => router.back()}
          className="text-orange-500 text-[14px] hover:text-orange-400 transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  const trailDirectionsUrl = runTrailDirectionsUrl(run);
  const stagingDirectionsUrl = runStagingDirectionsUrl(run);
  const hasDirections = !!(trailDirectionsUrl || stagingDirectionsUrl);

  return (
    <div className="min-h-screen bg-black pb-10">
      {/* ── Back header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-zinc-900 safe-top">
        <div className="px-4 py-3 max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={17} />
          </button>
          <h1 className="text-[16px] font-black text-white truncate flex-1">{run.title}</h1>
          <span className={`flex-shrink-0 px-2.5 py-1 text-[11px] font-black uppercase rounded-lg ${getStatusBadge(run.status)}`}>
            {run.status}
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-5">
        {run.run_source === 'user_submitted' && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-100/95 leading-relaxed">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200 mb-1">Community run</p>
                <p>
                  This meetup is <strong>not</strong> organized or verified by SoCalOffroaders or a verified
                  club. Trail conditions change; you are responsible for your safety, vehicle, and obeying
                  land-use and motor-vehicle laws.
                </p>
                <Link
                  href="/terms"
                  className="inline-block mt-2 text-[12px] font-semibold text-amber-300 underline"
                >
                  Terms of service
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Hero card ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
        >
          {/* Club + difficulty header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-800/60">
            <div className="flex items-center gap-2 min-w-0">
              {run.club?.logo ? (
                <img src={run.club.logo} alt={run.club.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Shield size={13} className="text-orange-500" />
                </div>
              )}
              {run.club ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-[13px] font-bold text-orange-500 truncate">{run.club.name}</p>
                  {run.run_source === 'club_official' && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded flex-shrink-0 text-emerald-400 bg-emerald-500/15 border border-emerald-500/30">
                      Club
                    </span>
                  )}
                </div>
              ) : run.run_source === 'club_official' ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-[13px] font-bold text-emerald-400 truncate">Staff verified</p>
                  <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded flex-shrink-0 text-emerald-400 bg-emerald-500/15 border border-emerald-500/30">
                    Club
                  </span>
                </div>
              ) : (
                <p className="text-[13px] text-zinc-500">Community / personal</p>
              )}
            </div>
            <span className={`flex-shrink-0 px-2.5 py-1 text-[11px] font-bold uppercase rounded-lg ${getDifficultyColor(run.difficulty)}`}>
              {run.difficulty}
            </span>
          </div>

          {/* Main info */}
          <div className="px-4 py-4 space-y-3">
            <h2 className="text-[20px] font-black text-white leading-snug">{run.title}</h2>

            {run.description && (
              <p className="text-[14px] text-zinc-400 leading-relaxed">{run.description}</p>
            )}

            {/* Host / club transparency */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Hosting & accountability</p>
              {run.club_id && run.club ? (
                <Link
                  href={`/clubs/${run.club_id}`}
                  className="flex items-center gap-2.5 min-w-0 group"
                >
                  {run.club.logo ? (
                    <img src={run.club.logo} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-zinc-700" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0 border border-orange-500/30">
                      <Building2 size={16} className="text-orange-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-500 uppercase font-bold">Club listing</p>
                    <p className="text-[14px] font-bold text-white truncate group-hover:text-orange-400 transition-colors">
                      {run.club.name}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-zinc-600 group-hover:text-orange-400 flex-shrink-0" />
                </Link>
              ) : run.run_source === 'club_official' ? (
                <p className="text-[13px] text-emerald-400/95 font-semibold">Official listing · Staff verified (no club page)</p>
              ) : null}
              {hostProfile && run.host_id ? (
                <Link
                  href={`/profile/${run.host_id}`}
                  className="flex items-center gap-2.5 min-w-0 group pt-1 border-t border-zinc-800/80"
                >
                  <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border border-zinc-700">
                    {hostProfile.avatar_url ? (
                      <img src={hostProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={16} className="text-zinc-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-500 uppercase font-bold">Organizer profile</p>
                    <p className="text-[14px] font-bold text-white truncate group-hover:text-orange-400 transition-colors">
                      {hostProfile.name ?? 'Host'}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-zinc-600 group-hover:text-orange-400 flex-shrink-0" />
                </Link>
              ) : run.host_id ? (
                <Link
                  href={`/profile/${run.host_id}`}
                  className="text-[13px] text-orange-500 font-semibold hover:text-orange-400 inline-flex items-center gap-1 pt-1 border-t border-zinc-800/80"
                >
                  View organizer profile <ExternalLink size={14} />
                </Link>
              ) : null}
            </div>

            {/* Detail rows */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 text-[14px]">
                <Calendar size={15} className="text-orange-500 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300">{formatRunDate(run.date)}</span>
              </div>

              {(run.meetup_latitude != null && run.meetup_longitude != null) || run.meetup_location ? (
                <div className="flex items-start gap-2.5 text-[14px]">
                  <MapPin size={15} className="text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase text-zinc-500 mb-0.5">Staging area (recorded)</p>
                    {run.meetup_latitude != null && run.meetup_longitude != null ? (
                      <>
                        <p className="text-zinc-300 font-mono text-[13px]">
                          {Number(run.meetup_latitude).toFixed(5)}, {Number(run.meetup_longitude).toFixed(5)}
                        </p>
                        {stagingDirectionsUrl && (
                          <a
                            href={stagingDirectionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1 text-[12px] font-semibold text-orange-500 hover:text-orange-400"
                          >
                            Open staging pin in Maps <ExternalLink size={12} />
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="text-zinc-300">{run.meetup_location}</span>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-2.5 text-[14px]">
                <Users size={15} className="text-orange-500 flex-shrink-0" />
                <span className={isFull ? 'text-red-400' : 'text-zinc-300'}>
                  {participants.length}
                  {run.max_participants != null ? `/${run.max_participants}` : ''} riders joined
                  {isFull && ' · Full'}
                </span>
              </div>

              {run.trail && run.trail_id && (
                <div className="flex items-center gap-2.5 text-[14px]">
                  <Mountain size={15} className="text-orange-500 flex-shrink-0" />
                  <Link
                    href={`/trails/${run.trail_id}`}
                    className="text-zinc-300 hover:text-orange-400 transition-colors min-w-0"
                  >
                    <span className="font-semibold">{run.trail.name}</span>
                    {run.trail.difficulty && (
                      <span className="text-zinc-500"> · {run.trail.difficulty}</span>
                    )}
                    <span className="sr-only"> — trail details</span>
                  </Link>
                </div>
              )}

              {run.vehicle_requirements && (
                <div className="flex items-start gap-2.5 text-[14px]">
                  <AlertTriangle size={15} className="text-orange-500 flex-shrink-0 mt-0.5" />
                  <span className="text-zinc-300">{run.vehicle_requirements}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Directions + RSVP ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-3"
        >
          {hasDirections && (
            <div className="grid grid-cols-1 gap-2">
              {trailDirectionsUrl && (
                <a
                  href={trailDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 text-zinc-100 hover:text-white text-[14px] font-bold rounded-xl transition-colors"
                >
                  <Mountain size={15} className="text-orange-500" />
                  Directions to trail
                  <ExternalLink size={14} className="text-zinc-500" />
                </a>
              )}
              {stagingDirectionsUrl && (
                <a
                  href={stagingDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 bg-zinc-900/80 border border-zinc-700 hover:border-orange-500/35 text-zinc-300 hover:text-white text-[13px] font-semibold rounded-xl transition-colors"
                >
                  <MapPin size={15} className="text-orange-500" />
                  Directions to staging pin
                  <ExternalLink size={13} className="text-zinc-500" />
                </a>
              )}
            </div>
          )}

          {run.status !== 'completed' && (
            <div className="grid grid-cols-1 gap-3">
              {isHost ? (
                <div className="flex items-center justify-center gap-2 py-3 text-[14px] font-bold rounded-xl border border-orange-500/35 bg-orange-500/10 text-orange-300">
                  <Shield size={16} className="text-orange-400 flex-shrink-0" />
                  {"You're the host"}
                </div>
              ) : (
                <button
                  onClick={handleRsvp}
                  disabled={(isFull && !joined) || joining}
                  className={`flex items-center justify-center gap-2 py-3 text-[14px] font-bold rounded-xl transition-colors ${
                    joined
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : isFull
                      ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                      : 'bg-orange-500 hover:bg-orange-600 text-black'
                  }`}
                >
                  {joining ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : joined ? (
                    <><CheckCircle2 size={16} /> Joined</>
                  ) : (
                    <><Zap size={16} /> Join Run</>
                  )}
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* ── Live SOS Alerts ───────────────────────────────────────────── */}
        <AnimatePresence>
          {activeAlerts
            .filter((a) => a.user_id === user?.id || !dismissedAlerts.has(a.id))
            .map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-red-950/60 border border-red-500/50 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500 animate-pulse flex-shrink-0">
                      <Siren size={14} className="text-white" />
                    </span>
                    <div>
                      <p className="text-[14px] font-black text-red-400 leading-none">SOS ALERT</p>
                      <p className="text-[11px] text-red-400/60 mt-0.5">
                        {new Date(alert.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {alert.user_id === user?.id ? (
                    <span className="text-[11px] font-bold text-red-300/80 uppercase tracking-wide flex-shrink-0">
                      Your alert
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDismissedAlerts((prev) => new Set([...prev, alert.id]))}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
                      aria-label="Dismiss alert"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <p className="text-[13px] text-red-200/90 leading-relaxed mb-3">
                  {alert.message ?? `${alert.user_name ?? 'A rider'} needs assistance.`}
                </p>

                {alert.latitude != null && alert.longitude != null && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-[13px] font-black rounded-xl transition-colors mb-2"
                  >
                    <Navigation size={14} />
                    Navigate to Stranded Rider
                  </a>
                )}

                {alert.user_id === user?.id && (
                  <button
                    type="button"
                    disabled={sosCancelId === alert.id}
                    onClick={() => void handleCancelOwnSOS(alert.id)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 border border-red-400/50 bg-red-950/40 hover:bg-red-950/70 text-red-200 text-[13px] font-black rounded-xl transition-colors disabled:opacity-50"
                  >
                    {sosCancelId === alert.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    Cancel SOS for everyone
                  </button>
                )}
              </motion.div>
            ))}
        </AnimatePresence>

        {/* ── Group chat (host + riders who joined) ───────────────────────── */}
        {canUseRunChat && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col max-h-[min(380px,52dvh)]"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/80">
              <MessageCircle size={16} className="text-orange-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white leading-none">Group chat</p>
                <p className="text-[11px] text-zinc-500 mt-1">Live updates for this run</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-[100px]">
              {chatMessages.length === 0 ? (
                <p className="text-center text-zinc-600 text-[13px] py-8 px-2">
                  No messages yet — coordinate meetup time or trail notes here.
                </p>
              ) : (
                chatMessages.map((m) => {
                  const mine = user?.id === m.user_id;
                  return (
                    <div key={m.id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden">
                        {m.users?.avatar_url ? (
                          <img src={m.users.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-500">
                            {(m.users?.name ?? 'R')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className={`min-w-0 max-w-[82%] ${mine ? 'text-right' : ''}`}>
                        <p className="text-[11px] text-zinc-500 mb-0.5">
                          {m.users?.name ?? 'Rider'}
                          <span className="text-zinc-600 mx-1">·</span>
                          {new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                        <p
                          className={`text-[13px] leading-snug rounded-xl px-3 py-2 inline-block text-left ${
                            mine
                              ? 'bg-orange-500/20 text-orange-100 border border-orange-500/25'
                              : 'bg-zinc-800 text-zinc-200 border border-zinc-700/80'
                          }`}
                        >
                          {m.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2 p-3 border-t border-zinc-800 bg-black/20">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendChat();
                  }
                }}
                placeholder="Message the group…"
                className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50"
                maxLength={2000}
                aria-label="Group message"
              />
              <button
                type="button"
                onClick={() => void handleSendChat()}
                disabled={chatSending || !chatInput.trim()}
                className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 text-black disabled:bg-zinc-800 disabled:text-zinc-600 transition-colors"
                aria-label="Send message"
              >
                {chatSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── SOS (only while run is active — on-trail emergencies) ───────── */}
        {showSOSButton && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <button
              onClick={() => setSosConfirmOpen(true)}
              disabled={sosSending}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 hover:border-red-500/70 text-red-400 hover:text-red-300 text-[14px] font-black rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sosSending ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Siren size={17} />
              )}
              {sosSending ? 'Sending SOS…' : 'SOS — I Need Assistance'}
            </button>
          </motion.div>
        )}

        {/* ── SOS Confirmation Modal ─────────────────────────────────────── */}
        <AnimatePresence>
          {sosConfirmOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="sos-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSosConfirmOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
              />
              {/* Modal */}
              <motion.div
                key="sos-modal"
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto px-4 pb-8"
              >
                <div className="bg-zinc-950 border border-red-500/40 rounded-2xl p-5">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 mx-auto mb-4">
                    <Siren size={22} className="text-red-400" />
                  </div>
                  <h3 className="text-[17px] font-black text-white text-center mb-2">Send SOS Alert?</h3>
                  <p className="text-[13px] text-zinc-400 text-center leading-relaxed mb-5">
                    This will broadcast an emergency alert with your GPS location to everyone in this run. Only use for genuine emergencies.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSosConfirmOpen(false)}
                      className="py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[14px] font-bold rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendSOS}
                      className="py-3 bg-red-500 hover:bg-red-600 text-white text-[14px] font-black rounded-xl transition-colors"
                    >
                      Send SOS
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Manage Run (host only) ────────────────────────────────────── */}
        <AnimatePresence>
          {isHost && run.status !== 'cancelled' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <BadgeCheck size={15} className="text-orange-500" />
                <p className="text-[13px] font-bold text-zinc-300">Host controls</p>
              </div>

              {run.status === 'completed' && (
                <p className="text-[13px] text-zinc-500">
                  This run is marked complete. You can remove the listing from the app when you no longer need it.
                </p>
              )}

              {run.status === 'upcoming' && (
                <>
                  <p className="text-[13px] text-zinc-500">
                    Activate when you are ready to depart. Riders can use SOS only while the run is active.
                  </p>
                  <button
                    onClick={handleActivate}
                    disabled={activating || !!hostBusy}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 text-black disabled:text-zinc-500 text-[14px] font-black rounded-xl transition-colors"
                  >
                    {activating ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Play size={15} />
                    )}
                    {activating ? 'Activating…' : 'Activate run'}
                  </button>
                </>
              )}

              {run.status === 'active' && (
                <>
                  <p className="text-[13px] text-zinc-500">
                    When everyone is back safe, mark complete. It closes chat and SOS for this event.
                  </p>
                  <button
                    onClick={handleCompleteRun}
                    disabled={!!hostBusy}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500/90 hover:bg-emerald-500 disabled:bg-zinc-700 text-black disabled:text-zinc-500 text-[14px] font-black rounded-xl transition-colors"
                  >
                    {hostBusy === 'complete' ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    {hostBusy === 'complete' ? 'Saving…' : 'Mark run complete'}
                  </button>
                </>
              )}

              {(run.status === 'upcoming' || run.status === 'active') && (
                <button
                  type="button"
                  onClick={handleCancelRun}
                  disabled={!!hostBusy}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-transparent border border-red-500/35 hover:bg-red-500/10 text-red-400 text-[13px] font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {hostBusy === 'cancel' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Ban size={15} />
                  )}
                  Cancel run (keep listing as cancelled)
                </button>
              )}

              <button
                type="button"
                onClick={handleDeleteRun}
                disabled={!!hostBusy}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-950/40 border border-red-600/40 hover:bg-red-950/70 text-red-300 text-[13px] font-black rounded-xl transition-colors disabled:opacity-50"
              >
                {hostBusy === 'delete' ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                Delete run permanently
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Participant list ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-orange-500" />
              <p className="text-[13px] font-bold text-white">Riders ({participants.length})</p>
            </div>
            {run.max_participants != null && (
              <p className="text-[12px] text-zinc-500">{run.max_participants - participants.length} spots left</p>
            )}
          </div>

          {participants.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-zinc-600 text-[13px]">No riders yet — be the first!</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {participants.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + i * 0.04 }}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden">
                    {p.users?.avatar_url ? (
                      <img
                        src={p.users.avatar_url}
                        alt={p.users.name ?? 'Rider'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={15} className="text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-white truncate">
                      {p.users?.name ?? 'Rider'}
                      {run.host_id === p.user_id && (
                        <span className="ml-1.5 px-1.5 py-px text-[9px] font-black text-black bg-orange-500 rounded leading-none">
                          HOST
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    p.rsvp_status === 'going'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-zinc-700 text-zinc-400'
                  }`}>
                    {p.rsvp_status === 'going'
                      ? 'Going'
                      : p.rsvp_status.charAt(0).toUpperCase() + p.rsvp_status.slice(1)}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Safety reminder ───────────────────────────────────────────── */}
        <div className="flex items-start gap-2.5 px-3 py-3 bg-orange-500/8 border border-orange-500/20 rounded-xl">
          <AlertTriangle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-orange-400/80 leading-relaxed">
            Always bring recovery gear, a first-aid kit, and ensure someone not on the run knows your itinerary.
          </p>
        </div>

      </main>
    </div>
  );
}
