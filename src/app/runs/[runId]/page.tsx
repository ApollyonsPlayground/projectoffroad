'use client';

import { useState, useEffect, useCallback } from 'react';
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
  BadgeCheck,
  Flag,
  Siren,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RunDetail {
  id: string;
  title: string;
  description: string | null;
  date: string;
  meetup_location: string | null;
  difficulty: string;
  max_participants: number | null;
  vehicle_requirements: string | null;
  status: string;
  host_id: string | null;
  club_id: string | null;
  trail_id: string | null;
  created_at: string;
  club: { name: string; logo: string | null } | null;
  trail: { name: string; difficulty: string | null } | null;
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
  alert_type: string;
  latitude: number | null;
  longitude: number | null;
  message: string | null;
  created_at: string;
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

  // SOS state
  const [sosSending, setSosSending] = useState(false);
  const [sosConfirmOpen, setSosConfirmOpen] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<RunAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const fetchDetail = useCallback(async () => {
    if (!supabaseClient || !runId) return;
    setIsLoading(true);
    try {
      const [runRes, participantsRes] = await Promise.all([
        supabaseClient
          .from('runs')
          .select(
            'id, title, description, date, meetup_location, difficulty, max_participants, vehicle_requirements, status, host_id, club_id, trail_id, created_at, club:clubs(name, logo), trail:trails(name, difficulty)'
          )
          .eq('id', runId)
          .single(),
        supabaseClient
          .from('run_participants')
          .select('id, user_id, rsvp_status, users(name, avatar_url)')
          .eq('run_id', runId),
      ]);

      if (runRes.error) throw runRes.error;
      setRun(runRes.data as unknown as RunDetail);
      const parts = (participantsRes.data ?? []) as Participant[];
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
    setJoining(true);
    try {
      if (joined) {
        const { error } = await supabaseClient
          .from('run_participants')
          .delete()
          .match({ run_id: run.id, user_id: user.id });
        if (error) throw error;
        setJoined(false);
        setParticipants((prev) => prev.filter((p) => p.user_id !== user.id));
        showToast('Left the run', 'info');
      } else {
        const { error } = await supabaseClient
          .from('run_participants')
          .insert({ run_id: run.id, user_id: user.id, rsvp_status: 'confirmed' });
        if (error && error.code !== '23505') throw error;
        setJoined(true);
        setParticipants((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            user_id: user.id,
            rsvp_status: 'confirmed',
            users: {
              name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'You',
              avatar_url: (user.user_metadata?.avatar_url as string) || null,
            },
          },
        ]);
        showToast(`You're in for "${run.title}"!`, 'success');
      }
    } catch {
      showToast('Could not update RSVP', 'error');
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

  // ── SOS: fetch existing alerts + subscribe to new ones ──────────────────────
  useEffect(() => {
    if (!supabaseClient || !runId) return;

    // Fetch any existing SOS alerts from the last 2 hours
    supabaseClient
      .from('run_alerts')
      .select('*')
      .eq('run_id', runId)
      .eq('alert_type', 'sos')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) setActiveAlerts(data as RunAlert[]);
      });

    // Subscribe to new SOS alerts in realtime
    const channel = supabaseClient
      .channel(`run-sos-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'run_alerts',
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          const alert = payload.new as RunAlert;
          if (alert.alert_type === 'sos') {
            setActiveAlerts((prev) => [alert, ...prev]);
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

    const userName =
      (user.user_metadata?.full_name as string) ||
      user.email?.split('@')[0] ||
      'A rider';

    try {
      // Grab browser GPS
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );

      const { latitude, longitude } = position.coords;

      const { error } = await supabaseClient.from('run_alerts').insert({
        run_id: run.id,
        user_id: user.id,
        user_name: userName,
        alert_type: 'sos',
        latitude,
        longitude,
        message: `${userName} needs assistance on ${run.title}.`,
      });

      if (error) throw error;
      showToast('SOS alert sent to all riders in this run.', 'success');
    } catch (err: any) {
      if (err?.code === 1) {
        // PERMISSION_DENIED — fall back to alert without coords
        const { error } = await supabaseClient.from('run_alerts').insert({
          run_id: run.id,
          user_id: user.id,
          user_name: userName,
          alert_type: 'sos',
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

  const isHost = user && run && user.id === run.host_id;
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
                <p className="text-[13px] font-bold text-orange-500 truncate">{run.club.name}</p>
              ) : (
                <p className="text-[13px] text-zinc-500">Personal run</p>
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

            {/* Detail rows */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 text-[14px]">
                <Calendar size={15} className="text-orange-500 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-300">{formatRunDate(run.date)}</span>
              </div>

              {run.meetup_location && (
                <div className="flex items-start gap-2.5 text-[14px]">
                  <MapPin size={15} className="text-orange-500 flex-shrink-0 mt-0.5" />
                  <span className="text-zinc-300">{run.meetup_location}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5 text-[14px]">
                <Users size={15} className="text-orange-500 flex-shrink-0" />
                <span className={isFull ? 'text-red-400' : 'text-zinc-300'}>
                  {participants.length}
                  {run.max_participants != null ? `/${run.max_participants}` : ''} riders joined
                  {isFull && ' · Full'}
                </span>
              </div>

              {run.trail && (
                <div className="flex items-center gap-2.5 text-[14px]">
                  <Mountain size={15} className="text-orange-500 flex-shrink-0" />
                  <span className="text-zinc-300">
                    {run.trail.name}
                    {run.trail.difficulty && (
                      <span className="text-zinc-500"> · {run.trail.difficulty}</span>
                    )}
                  </span>
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

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* Get Directions */}
          {run.meetup_location && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(run.meetup_location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 text-zinc-300 hover:text-white text-[14px] font-semibold rounded-xl transition-colors"
            >
              <Navigation size={15} className="text-orange-500" />
              Get Directions
            </a>
          )}

          {/* RSVP / Join */}
          {run.status !== 'completed' && (
            <button
              onClick={handleRsvp}
              disabled={(isFull && !joined) || joining}
              className={`flex items-center justify-center gap-2 py-3 text-[14px] font-bold rounded-xl transition-colors ${
                joined
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : isFull
                  ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-black'
              } ${!run.meetup_location ? 'col-span-2' : ''}`}
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
        </motion.div>

        {/* ── Live SOS Alerts ───────────────────────────────────────────── */}
        <AnimatePresence>
          {activeAlerts
            .filter((a) => !dismissedAlerts.has(a.id))
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
                  <button
                    onClick={() => setDismissedAlerts((prev) => new Set([...prev, alert.id]))}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
                    aria-label="Dismiss alert"
                  >
                    <X size={16} />
                  </button>
                </div>

                <p className="text-[13px] text-red-200/90 leading-relaxed mb-3">
                  {alert.message ?? `${alert.user_name ?? 'A rider'} needs assistance.`}
                </p>

                {alert.latitude != null && alert.longitude != null && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${alert.latitude},${alert.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-[13px] font-black rounded-xl transition-colors"
                  >
                    <Navigation size={14} />
                    Navigate to Stranded Rider
                  </a>
                )}
              </motion.div>
            ))}
        </AnimatePresence>

        {/* ── SOS Button (participants + active runs) ────────────────────── */}
        {(joined || isHost) && (
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
          {isHost && run.status === 'upcoming' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <BadgeCheck size={15} className="text-orange-500" />
                <p className="text-[13px] font-bold text-zinc-300">Host Controls</p>
              </div>
              <p className="text-[13px] text-zinc-500 mb-3">
                Mark this run as active when you are ready to depart. Participants will be notified.
              </p>
              <button
                onClick={handleActivate}
                disabled={activating}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 text-black disabled:text-zinc-500 text-[14px] font-black rounded-xl transition-colors"
              >
                {activating ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Play size={15} />
                )}
                {activating ? 'Activating…' : 'Activate Run'}
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
                    p.rsvp_status === 'confirmed'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-zinc-700 text-zinc-400'
                  }`}>
                    {p.rsvp_status}
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
