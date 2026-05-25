'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Pencil,
  Send,
  MessageCircle,
  Ban,
  Trash2,
  ChevronRight,
  ExternalLink,
  Radio,
  StickyNote,
  ImageIcon,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { snapshotPublicIdentity } from '@/lib/profileDisplay';
import type { RunLiveMapParticipant } from '@/components/RunLiveMap';
import { RUN_GROUP_CHAT_PRESETS } from '@/lib/runs/chatPresets';
import { mapDbTrailRow, coordsFromRow } from '@/lib/trails/mapDbTrail';
import { resizeImageFileToJpegBlob, isLimitedMediaDevice } from '@/lib/media/mobileSafeCapture';
import { ensureStoragePublicObjectUrl } from '@/lib/supabase/storagePublicUrl';
import { isRunDetailsEditLocked } from '@/lib/runs/runEditLock';
import {
  runAccountabilityHeading,
  runHostFallbackName,
  runHostProfileHeading,
  runHostProfileLinkText,
  runHostSelfDetailBadge,
  runHostSelfToast,
  runHostControlsHeading,
} from '@/lib/runs/runHostLabel';
import { cancelRunTimeLocalReminders, scheduleRunTimeLocalReminders } from '@/lib/runs/runReminderLocal';
import { isPlatformStaffRole } from '@/lib/admin/platformStaff';
import { runJoinActionLabel } from '@/lib/runs/runParticipation';

const RunLiveMap = dynamic(() => import('@/components/RunLiveMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[min(320px,55dvh)] flex items-center justify-center bg-card border border-border rounded-2xl">
      <Loader2 className="animate-spin text-primary" size={24} />
    </div>
  ),
});

const MeetupMapPicker = dynamic(() => import('@/components/runs/MeetupMapPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] bg-card animate-pulse rounded-xl border border-border" aria-hidden />
  ),
});

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
  comms_note: string | null;
  status: string;
  host_id: string | null;
  club_id: string | null;
  trail_id: string | null;
  run_source: 'club_official' | 'user_submitted' | null;
  flyer_image?: string | null;
  user_acknowledged_disclaimer_at: string | null;
  created_at: string;
  club: { name: string; logo: string | null; verified?: boolean } | null;
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

interface RunReflectionRow {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  users?: { name: string | null } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDifficultyColor(d: string) {
  const level = (d ?? '').toLowerCase();
  if (level === 'beginner' || level === 'easy')
    return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
  if (level === 'moderate' || level === 'intermediate')
    return 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30';
  if (level === 'advanced' || level === 'challenging')
    return 'bg-primary/15 text-primary/90 border border-primary/30';
  if (level === 'extreme')
    return 'bg-red-500/15 text-red-400 border border-red-500/30';
  return 'bg-zinc-700/50 text-muted-foreground';
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
    return 'bg-zinc-700/50 text-muted-foreground';
  return 'bg-primary/15 text-primary/90 border border-primary/30';
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

function isLikelyUuid(id: string): boolean {
  // Loose RFC-style UUID check (allows any version nibble) — avoids rejecting newer generators.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

function trailRowToRunEmbed(row: Record<string, unknown>): RunTrailEmbed {
  const m = mapDbTrailRow(row);
  const c = coordsFromRow(row);
  const coordStr =
    typeof row.coordinates === 'string' && row.coordinates.trim()
      ? row.coordinates.trim()
      : m.coordinates ?? null;
  return {
    name: m.name,
    difficulty: m.difficulty,
    latitude: c?.lat ?? null,
    longitude: c?.lng ?? null,
    coordinates: coordStr,
  };
}

// ─── Detail Page ──────────────────────────────────────────────────────────────

export default function RunDetailPage() {
  const params = useParams();
  const runIdResolved = useMemo(() => {
    const raw = params?.runId;
    const s = Array.isArray(raw) ? raw[0] : raw;
    if (typeof s !== 'string') return '';
    return s.trim().replace(/\/+$/, '');
  }, [params?.runId]);
  const router = useRouter();
  const { user, profile, supabaseClient } = useAuth();
  const { showToast } = useToast();

  const [run, setRun] = useState<RunDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [activating, setActivating] = useState(false);
  const [hostBusy, setHostBusy] = useState<'complete' | 'cancel' | 'delete' | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);

  // Host edit
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDifficulty, setEditDifficulty] = useState('');
  const [editMax, setEditMax] = useState<string>('');
  const [editVehicleReq, setEditVehicleReq] = useState('');
  const [editComms, setEditComms] = useState('');
  const [editMeetupLat, setEditMeetupLat] = useState<number>(0);
  const [editMeetupLng, setEditMeetupLng] = useState<number>(0);
  const [editMapCenter, setEditMapCenter] = useState<[number, number]>([34.05, -116.8]);
  const [editZoom, setEditZoom] = useState(16);
  const [, setEditPinTouched] = useState(false);
  const [editFlyerFile, setEditFlyerFile] = useState<File | null>(null);
  const [editFlyerPreviewUrl, setEditFlyerPreviewUrl] = useState('');
  const [editFlyerRemoved, setEditFlyerRemoved] = useState(false);
  const [editAddressQuery, setEditAddressQuery] = useState('');
  const [editGeocodeLoading, setEditGeocodeLoading] = useState(false);
  const [editGeocodeResults, setEditGeocodeResults] = useState<{ lat: number; lng: number; label: string }[]>([]);

  const isHost = Boolean(user && run && user.id === run.host_id);
  const isStaff = Boolean(
    user && profile && isPlatformStaffRole(String((profile as { role?: unknown }).role ?? ''))
  );
  const canManageRun = Boolean(user && run && (isHost || isStaff));
  const canEditRun = canManageRun;
  const runIsLive = run?.status === 'active';
  const runTimeEditLocked = Boolean(run && isRunDetailsEditLocked(run));
  const editFieldsLocked = Boolean(editOpen && runTimeEditLocked);
  const runStartsInFuture = Boolean(run && new Date(run.date).getTime() > Date.now());

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

  const [runReflections, setRunReflections] = useState<RunReflectionRow[]>([]);
  const [reflectionBody, setReflectionBody] = useState('');
  const [reflectionSaving, setReflectionSaving] = useState(false);
  const reflectionTouchedRef = useRef(false);

  const fetchDetail = useCallback(async () => {
    if (!supabaseClient || !runIdResolved) return;
    if (!isLikelyUuid(runIdResolved)) {
      showToast('Invalid run link', 'error');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setHostProfile(null);
    try {
      // Avoid PostgREST FK embeds (`club:clubs`, `trail:trails`) — they often return 422 when
      // relationships are missing from schema cache or ambiguous. Match `/runs` list strategy.
      const runSelectAttempts = [
        '*',
        'id, title, description, date, meetup_location, meetup_latitude, meetup_longitude, difficulty, max_participants, vehicle_requirements, comms_note, status, host_id, club_id, trail_id, run_source, flyer_image, user_acknowledged_disclaimer_at, created_at',
      ];

      let runPayload: Record<string, unknown> | null = null;
      let lastRunError: { message?: string } | null = null;
      for (const sel of runSelectAttempts) {
        const { data, error } = await supabaseClient
          .from('runs')
          .select(sel)
          .eq('id', runIdResolved)
          .maybeSingle();
        if (!error && data) {
          runPayload = data as unknown as Record<string, unknown>;
          break;
        }
        lastRunError = error;
      }

      if (!runPayload) {
        throw lastRunError ?? new Error('Run not found');
      }

      const clubKey = runPayload.club_id != null ? String(runPayload.club_id).trim() : '';
      const trailKey = runPayload.trail_id != null ? String(runPayload.trail_id).trim() : '';

      const [clubRes, trailRes] = await Promise.all([
        clubKey && isLikelyUuid(clubKey)
          ? supabaseClient.from('clubs').select('name, logo, verified').eq('id', clubKey).maybeSingle()
          : Promise.resolve({ data: null as null }),
        trailKey && isLikelyUuid(trailKey)
          ? supabaseClient.from('trails').select('*').eq('id', trailKey).maybeSingle()
          : Promise.resolve({ data: null as null }),
      ]);

      let clubEmbed: RunDetail['club'] = null;
      if (clubRes.data && typeof clubRes.data === 'object') {
        const c = clubRes.data as { name?: unknown; logo?: unknown; verified?: unknown };
        clubEmbed = {
          name: String(c.name ?? 'Club'),
          logo: (c.logo as string | null) ?? null,
          verified: Boolean(c.verified),
        };
      }

      let trailEmbed: RunDetail['trail'] = null;
      if (trailRes.data && typeof trailRes.data === 'object') {
        trailEmbed = trailRowToRunEmbed(trailRes.data as Record<string, unknown>);
      }

      const loaded: RunDetail = {
        ...(runPayload as unknown as RunDetail),
        club: clubEmbed,
        trail: trailEmbed,
      };
      // Ensure badge reflects current club verification (not just what the host chose at creation time).
      if (clubEmbed && clubKey) {
        loaded.run_source = clubEmbed.verified ? 'club_official' : 'user_submitted';
      }
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

      let parts: Participant[] = [];
      const participantsEmb = await supabaseClient
        .from('run_participants')
        .select('id, user_id, rsvp_status, users(name, avatar_url)')
        .eq('run_id', runIdResolved);

      if (!participantsEmb.error && participantsEmb.data) {
        parts = participantsEmb.data as unknown as Participant[];
      } else {
        const base = await supabaseClient
          .from('run_participants')
          .select('id, user_id, rsvp_status')
          .eq('run_id', runIdResolved);
        const rawRows = (base.data ?? []) as { id: string; user_id: string; rsvp_status: string }[];
        const userIds = [...new Set(rawRows.map((r) => r.user_id).filter(Boolean))];
        const usersById: Record<string, { name: string | null; avatar_url: string | null }> = {};
        if (userIds.length) {
          const { data: urows } = await supabaseClient
            .from('users')
            .select('id, name, avatar_url')
            .in('id', userIds);
          for (const u of urows ?? []) {
            const row = u as { id: string; name: string | null; avatar_url: string | null };
            usersById[row.id] = { name: row.name ?? null, avatar_url: row.avatar_url ?? null };
          }
        }
        parts = rawRows.map((r) => ({
          id: r.id,
          user_id: r.user_id,
          rsvp_status: r.rsvp_status,
          users: usersById[r.user_id] ?? null,
        }));
      }

      setParticipants(parts);
      if (user) {
        setJoined(parts.some((p) => p.user_id === user.id));
      }
    } catch {
      showToast('Could not load run', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, runIdResolved, user, showToast]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // Prime edit form when run loads/changes.
  useEffect(() => {
    if (!run) return;
    setEditTitle(run.title ?? '');
    setEditDescription(run.description ?? '');
    // datetime-local expects "YYYY-MM-DDTHH:mm"
    try {
      const d = new Date(run.date);
      const pad = (n: number) => String(n).padStart(2, '0');
      if (!Number.isNaN(d.getTime())) {
        const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setEditDate(local);
      } else {
        setEditDate('');
      }
    } catch {
      setEditDate('');
    }
    setEditDifficulty(run.difficulty ?? 'Moderate');
    setEditMax(run.max_participants != null ? String(run.max_participants) : '');
    setEditVehicleReq(run.vehicle_requirements ?? '');
    setEditComms(run.comms_note ?? '');
    const lat = run.meetup_latitude != null ? Number(run.meetup_latitude) : NaN;
    const lng = run.meetup_longitude != null ? Number(run.meetup_longitude) : NaN;
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      setEditMeetupLat(lat);
      setEditMeetupLng(lng);
      setEditMapCenter([lat, lng]);
      setEditZoom(16);
    }
    setEditPinTouched(false);
  }, [run?.id]);

  useEffect(() => {
    if (!editFlyerFile) {
      setEditFlyerPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return '';
      });
      return;
    }
    const url = URL.createObjectURL(editFlyerFile);
    setEditFlyerPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
     
  }, [editFlyerFile]);

  useEffect(() => {
    if (!editOpen) {
      setEditFlyerRemoved(false);
      setEditFlyerFile(null);
      setEditAddressQuery('');
      setEditGeocodeResults([]);
    }
  }, [editOpen]);

  useEffect(() => {
    reflectionTouchedRef.current = false;
    setReflectionBody('');
    setRunReflections([]);
  }, [runIdResolved]);

  useEffect(() => {
    if (!supabaseClient || !runIdResolved || !run || run.status !== 'completed') return;

    let cancelled = false;
    void (async () => {
      const attempts = ['id, body, created_at, updated_at, user_id, users(name)', 'id, body, created_at, updated_at, user_id'];
      for (const sel of attempts) {
        const { data, error } = await supabaseClient
          .from('run_reflections')
          .select(sel)
          .eq('run_id', runIdResolved)
          .order('created_at', { ascending: false });
        if (!error && data != null && !cancelled) {
          const rows = data as unknown as RunReflectionRow[];
          setRunReflections(rows);
          const mine = user ? rows.find((r) => r.user_id === user.id) : undefined;
          if (!reflectionTouchedRef.current) {
            setReflectionBody(mine?.body ?? '');
          }
          break;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabaseClient, runIdResolved, run?.id, run?.status, user?.id]);

  // ── RSVP ────────────────────────────────────────────────────────────────────
  const handleRsvp = async () => {
    if (!user) { showToast('Sign in to join a run', 'info'); return; }
    if (!supabaseClient || !run) return;
    if (user.id === run.host_id) {
      showToast(runHostSelfToast(run.run_source), 'info');
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
        await cancelRunTimeLocalReminders(run.id);
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
        showToast(
          run.status === 'active'
            ? `You're in on this live run — open chat and the map below.`
            : `You're in for "${run.title}"!`,
          'success'
        );
        const remindOk = (profile?.notify_run_time_reminders as boolean | undefined) !== false;
        if (remindOk) {
          void scheduleRunTimeLocalReminders({
            runId: run.id,
            title: run.title,
            runDateIso: run.date,
          });
        }
      }
    } finally {
      setJoining(false);
    }
  };

  // ── Activate run (host or platform staff) ─────────────────────────────────
  const handleActivate = async () => {
    if (!supabaseClient || !run) return;
    if (isStaff && !isHost) {
      const ok = window.confirm(
        'Start this run now on behalf of the host? Riders will see it as live and can join in progress.'
      );
      if (!ok) return;
    }
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
    if (!supabaseClient || !runIdResolved) return;

    // Fetch any existing SOS alerts from the last 2 hours
    supabaseClient
      .from('sos_alerts')
      .select('*')
      .eq('run_id', runIdResolved)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) setActiveAlerts(data as RunAlert[]);
      });

    // Subscribe to new SOS alerts + cancellations (DELETE) in realtime
    const channel = supabaseClient
      .channel(`sos-alerts-${runIdResolved}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sos_alerts',
          filter: `run_id=eq.${runIdResolved}`,
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
          filter: `run_id=eq.${runIdResolved}`,
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
  }, [supabaseClient, runIdResolved]);

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
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err ? (err as { code?: unknown }).code : undefined;
      if (code === 1) {
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

  const applyEditGeocodeHit = (r: { lat: number; lng: number }) => {
    setEditMapCenter([r.lat, r.lng]);
    setEditMeetupLat(r.lat);
    setEditMeetupLng(r.lng);
    setEditZoom(17);
    setEditGeocodeResults([]);
    setEditAddressQuery('');
    setEditPinTouched(true);
  };

  const runEditAddressSearch = async () => {
    const q = editAddressQuery.trim();
    if (q.length < 3) {
      showToast('Type at least 3 characters to search', 'error');
      return;
    }
    if (!supabaseClient) return;
    setEditGeocodeLoading(true);
    setEditGeocodeResults([]);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { error?: string; results?: { lat: number; lng: number; label: string }[] };
      if (!res.ok) {
        showToast(data.error ?? 'Search failed', 'error');
        return;
      }
      const results = data.results ?? [];
      if (!results.length) {
        showToast('No places matched — try a street, town, or trailhead name', 'error');
        return;
      }
      setEditGeocodeResults(results);
    } catch {
      showToast('Search failed', 'error');
    } finally {
      setEditGeocodeLoading(false);
    }
  };

  const saveRunEdits = async () => {
    if (!supabaseClient || !run || !user) return;
    if (!canEditRun) return;

    const timeLocked = isRunDetailsEditLocked(run);

    if (timeLocked) {
      if (!editDate) {
        showToast('Pick a new date/time to postpone', 'error');
        return;
      }
      const newTs = new Date(editDate).getTime();
      const oldTs = new Date(run.date).getTime();
      if (!Number.isFinite(newTs)) {
        showToast('Invalid date', 'error');
        return;
      }
      if (newTs === oldTs) {
        showToast(
          'Details are locked within 24 hours of start. Change the date to postpone, or mark complete / cancel from the run page.',
          'info'
        );
        return;
      }
      const minPostpone = Date.now() + 24 * 60 * 60 * 1000;
      if (newTs <= minPostpone) {
        showToast('New start time must be more than 24 hours from now.', 'error');
        return;
      }
      const newIso = new Date(editDate).toISOString();
      setEditSaving(true);
      try {
        const { error } = await supabaseClient.from('runs').update({ date: newIso }).eq('id', run.id);
        if (error) throw error;
        const remindOk = (profile?.notify_run_time_reminders as boolean | undefined) !== false;
        if (joined && remindOk) {
          await cancelRunTimeLocalReminders(run.id);
          await scheduleRunTimeLocalReminders({
            runId: run.id,
            title: run.title,
            runDateIso: newIso,
          });
        }
        showToast('Run rescheduled', 'success');
        setEditOpen(false);
        await fetchDetail();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not update run';
        if (msg.includes('run_edit_locked') || msg.toLowerCase().includes('locked within 24')) {
          showToast(
            'Could not save — run is in the lock window. Try a start time more than 24 hours from now.',
            'error'
          );
        } else {
          showToast(msg, 'error');
        }
      } finally {
        setEditSaving(false);
      }
      return;
    }

    const title = editTitle.trim();
    if (!title) {
      showToast('Title is required', 'error');
      return;
    }
    if (!editDate) {
      showToast('Pick a date/time', 'error');
      return;
    }
    const dateIso = new Date(editDate).toISOString();

    if (
      !Number.isFinite(editMeetupLat) ||
      !Number.isFinite(editMeetupLng) ||
      Math.abs(editMeetupLat) > 90 ||
      Math.abs(editMeetupLng) > 180
    ) {
      showToast('Set the staging pin on the map', 'error');
      return;
    }

    setEditSaving(true);
    try {
      const patch: Record<string, unknown> = {
        title,
        description: editDescription.trim() || null,
        date: dateIso,
        difficulty: editDifficulty,
        max_participants: editMax.trim() ? parseInt(editMax.trim(), 10) : null,
        vehicle_requirements: editVehicleReq.trim() || null,
        comms_note: editComms.trim() || null,
        meetup_latitude: editMeetupLat,
        meetup_longitude: editMeetupLng,
        meetup_location: `Staging pin · ${editMeetupLat.toFixed(6)}, ${editMeetupLng.toFixed(6)}`,
      };

      const { error } = await supabaseClient.from('runs').update(patch).eq('id', run.id);
      if (error) throw error;

      if (editFlyerFile) {
        try {
          const maxEdge = isLimitedMediaDevice() ? 1400 : 2200;
          const blob = await resizeImageFileToJpegBlob(editFlyerFile, maxEdge, 0.88);
          const path = `${run.id}/${crypto.randomUUID()}.jpg`;
          const { error: upErr } = await supabaseClient.storage
            .from('run-flyers')
            .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
          if (upErr) throw upErr;
          const { data: pub } = supabaseClient.storage.from('run-flyers').getPublicUrl(path);
          const publicUrl = pub?.publicUrl ? String(pub.publicUrl) : '';
          if (publicUrl) {
            const { error: flyerErr } = await supabaseClient
              .from('runs')
              .update({ flyer_image: publicUrl })
              .eq('id', run.id);
            if (flyerErr) throw flyerErr;
          }
        } catch (fe) {
          showToast(
            fe instanceof Error ? fe.message : 'Flyer upload failed — other details were saved.',
            'info'
          );
        }
      } else if (editFlyerRemoved) {
        const { error: flyerErr } = await supabaseClient
          .from('runs')
          .update({ flyer_image: null })
          .eq('id', run.id);
        if (flyerErr) throw flyerErr;
      }

      const remindOk = (profile?.notify_run_time_reminders as boolean | undefined) !== false;
      if (joined && remindOk) {
        await cancelRunTimeLocalReminders(run.id);
        await scheduleRunTimeLocalReminders({
          runId: run.id,
          title,
          runDateIso: dateIso,
        });
      }

      showToast('Run updated', 'success');
      setEditOpen(false);
      await fetchDetail();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not update run';
      if (msg.includes('run_edit_locked') || msg.toLowerCase().includes('locked within 24')) {
        showToast(
          'This run is locked for edits within 24 hours of the original start. Postpone by moving the start more than 24 hours out, or contact an admin.',
          'error'
        );
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setEditSaving(false);
    }
  };

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
    if (!supabaseClient || !runIdResolved || !run || !user || !canUseRunChat) return;

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
          .eq('run_id', runIdResolved)
          .order('created_at', { ascending: true })
          .limit(120);
        if (!error && data != null && !cancelled) {
          setChatMessages((data as unknown as RunChatMessage[]).map((m) => enrichChatRow(m)));
          break;
        }
      }
    })();

    const channel = supabaseClient
      .channel(`run-chat-${runIdResolved}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `run_id=eq.${runIdResolved}`,
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
  }, [supabaseClient, runIdResolved, run?.id, run?.status, run?.host_id, user?.id, canUseRunChat, enrichChatRow]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const handleSendChat = async (directText?: string) => {
    if (!supabaseClient || !run || !user || !canUseRunChat) return;
    const text = (directText ?? chatInput).trim();
    if (!text) return;
    setChatSending(true);
    try {
      const { data, error } = await supabaseClient
        .from('messages')
        .insert({ run_id: run.id, user_id: user.id, content: text })
        .select('id, content, created_at, user_id')
        .single();
      if (error) throw error;
      if (directText == null) setChatInput('');
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

  const handleSaveReflection = async () => {
    if (!supabaseClient || !run || !user) return;
    if (run.status !== 'completed') return;
    const canWrite = joined || user.id === run.host_id;
    if (!canWrite) {
      showToast('Only riders who went on this run can add a trip note', 'info');
      return;
    }
    const body = reflectionBody.trim();
    if (!body) {
      showToast('Write a short note about how the run went', 'info');
      return;
    }
    if (body.length > 4000) {
      showToast('Keep it under 4000 characters', 'info');
      return;
    }
    setReflectionSaving(true);
    try {
      const { error } = await supabaseClient.from('run_reflections').upsert(
        { run_id: run.id, user_id: user.id, body },
        { onConflict: 'run_id,user_id' }
      );
      if (error) throw error;
      showToast('Trip note saved', 'success');
      const { data: again } = await supabaseClient
        .from('run_reflections')
        .select('id, body, created_at, updated_at, user_id, users(name)')
        .eq('run_id', run.id)
        .order('created_at', { ascending: false });
      if (again) setRunReflections(again as unknown as RunReflectionRow[]);
    } catch {
      showToast('Could not save trip note — try again after migrations are applied', 'error');
    } finally {
      setReflectionSaving(false);
    }
  };

  const isFull = run?.max_participants != null && participants.length >= run.max_participants;

  /** Must stay above loading/not-found returns — hooks cannot follow conditional returns. */
  const liveMapParticipants = useMemo((): RunLiveMapParticipant[] => {
    if (!run) return [];
    const base: RunLiveMapParticipant[] = participants.map((p) => ({
      user_id: p.user_id,
      users: p.users ? { name: p.users.name } : null,
    }));
    if (run.host_id && !participants.some((p) => p.user_id === run.host_id)) {
      base.push({
        user_id: run.host_id,
        users: { name: hostProfile?.name ?? runHostFallbackName(run?.run_source) },
      });
    }
    return base;
  }, [participants, run, hostProfile?.name]);

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-center px-6">
        <Flag size={36} className="text-muted-foreground" />
        <p className="text-foreground font-bold text-[16px]">Run not found</p>
        <button
          onClick={() => router.back()}
          className="text-primary text-[14px] hover:text-primary/90 transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  const trailDirectionsUrl = runTrailDirectionsUrl(run);
  const stagingDirectionsUrl = runStagingDirectionsUrl(run);
  const hasDirections = !!(trailDirectionsUrl || stagingDirectionsUrl);

  const liveMapReference =
    (() => {
      const lat = run.meetup_latitude != null ? Number(run.meetup_latitude) : NaN;
      const lng = run.meetup_longitude != null ? Number(run.meetup_longitude) : NaN;
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
      return coordsFromTrailEmbed(run.trail);
    })();

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* ── Back header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border safe-top">
        <div className="px-4 py-3 max-w-app-shell mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-card text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={17} />
          </button>
          <h1 className="text-[16px] font-black text-foreground truncate flex-1">{run.title}</h1>
          {canEditRun && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="min-h-[36px] px-3 rounded-xl bg-primary text-primary-foreground text-[12px] font-black hover:bg-primary/90 transition-colors flex items-center gap-1.5 flex-shrink-0"
              aria-label="Edit run"
              title={
                runTimeEditLocked
                  ? 'Details lock 24h before start — open to postpone the date or view fields'
                  : 'Edit run'
              }
            >
              <Pencil size={14} />
              Edit
            </button>
          )}
          <span className={`flex-shrink-0 px-2.5 py-1 text-[11px] font-black uppercase rounded-lg ${getStatusBadge(run.status)}`}>
            {run.status}
          </span>
        </div>
      </header>

      <main className="max-w-app-shell mx-auto px-4 pt-5 space-y-5">
        <AnimatePresence>
          {editOpen && (
            <>
              <motion.div
                key="edit-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9990] bg-background/80 backdrop-blur-sm"
                onClick={() => (editSaving ? null : setEditOpen(false))}
              />
              <motion.div
                key="edit-drawer"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                className="fixed bottom-0 left-0 right-0 z-[9991] max-w-app-shell mx-auto bg-muted border border-border rounded-t-2xl max-h-[92dvh] flex flex-col"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Pencil size={16} className="text-primary" />
                    <h2 className="text-[16px] font-black text-foreground">Edit run</h2>
                  </div>
                  <button
                    type="button"
                    disabled={editSaving}
                    onClick={() => setEditOpen(false)}
                    className="w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors touch-manipulation disabled:opacity-50"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4">
                  {editFieldsLocked ? (
                    <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-100/95 leading-relaxed">
                      This run is in the <span className="font-semibold">24-hour lock</span> before start: title,
                      meetup, flyer, and other details cannot be changed. You can still{' '}
                      <span className="font-semibold">move the date/time</span> to postpone (new start must be more
                      than 24 hours from now), or use Mark complete / Cancel run on the main page.
                    </div>
                  ) : null}
                  <div>
                    <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Title
                    </label>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      disabled={editSaving || editFieldsLocked}
                      className="w-full min-h-[44px] bg-card border border-border rounded-xl px-3 py-2.5 text-[15px] text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/60 transition-colors touch-manipulation disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      disabled={editSaving || editFieldsLocked}
                      rows={3}
                      className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-[15px] text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/60 transition-colors touch-manipulation resize-none disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      <ImageIcon size={12} className="inline mr-1 align-text-bottom text-muted-foreground" />
                      Run flyer / poster (optional)
                    </label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={editSaving || editFieldsLocked}
                        className="w-full min-h-[44px] bg-card border border-border rounded-xl px-3 py-2 text-[14px] text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-[13px] file:text-foreground disabled:opacity-50"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          if (f && !f.type.startsWith('image/')) {
                            showToast('Use an image file', 'info');
                            e.target.value = '';
                            return;
                          }
                          if (f && f.size > 5 * 1024 * 1024) {
                            showToast('Image must be under 5 MB', 'info');
                            e.target.value = '';
                            return;
                          }
                          setEditFlyerRemoved(false);
                          setEditFlyerFile(f);
                        }}
                      />
                      {editFlyerPreviewUrl ? (
                        <div className="rounded-xl border border-border bg-muted overflow-hidden">
                          <img
                            src={editFlyerPreviewUrl}
                            alt="Flyer preview"
                            className="w-full max-h-[280px] object-cover"
                          />
                          <button
                            type="button"
                            disabled={editSaving || editFieldsLocked}
                            onClick={() => setEditFlyerFile(null)}
                            className="w-full flex items-center justify-center gap-2 py-2 text-[12px] font-bold text-muted-foreground hover:text-foreground border-t border-border bg-muted/40 disabled:opacity-50"
                          >
                            <X size={14} />
                            Remove new flyer
                          </button>
                        </div>
                      ) : run.flyer_image && String(run.flyer_image).trim() && !editFlyerRemoved ? (
                        <div className="rounded-xl border border-border bg-muted overflow-hidden">
                          <img
                            src={
                              ensureStoragePublicObjectUrl(String(run.flyer_image)) ||
                              String(run.flyer_image)
                            }
                            alt="Current flyer"
                            className="w-full max-h-[280px] object-cover"
                          />
                          <button
                            type="button"
                            disabled={editSaving || editFieldsLocked}
                            onClick={() => {
                              setEditFlyerRemoved(true);
                              setEditFlyerFile(null);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2 text-[12px] font-bold text-muted-foreground hover:text-foreground border-t border-border bg-muted/40 disabled:opacity-50"
                          >
                            <X size={14} />
                            Remove flyer
                          </button>
                        </div>
                      ) : (
                        <p className="text-[12px] text-muted-foreground">
                          Adds a poster image to the run card and run detail page.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Date & time
                    </label>
                    <input
                      type="datetime-local"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      disabled={editSaving}
                      className="w-full min-h-[44px] bg-card border border-border rounded-xl px-3 py-2.5 text-[15px] text-foreground [color-scheme:dark] focus:outline-none focus:border-primary/60 transition-colors touch-manipulation disabled:opacity-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Difficulty
                      </label>
                      <select
                        value={editDifficulty}
                        onChange={(e) => setEditDifficulty(e.target.value)}
                        disabled={editSaving || editFieldsLocked}
                        className="w-full min-h-[44px] bg-card border border-border rounded-xl px-3 py-2.5 text-[15px] text-foreground focus:outline-none focus:border-primary/60 transition-colors touch-manipulation disabled:opacity-50"
                      >
                        {['Easy', 'Moderate', 'Challenging', 'Extreme'].map((d) => (
                          <option key={d} value={d} className="bg-card">
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Max rigs
                      </label>
                      <input
                        value={editMax}
                        onChange={(e) => setEditMax(e.target.value)}
                        inputMode="numeric"
                        placeholder="Optional"
                        disabled={editSaving || editFieldsLocked}
                        className="w-full min-h-[44px] bg-card border border-border rounded-xl px-3 py-2.5 text-[15px] text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/60 transition-colors touch-manipulation disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Vehicle / gear notes
                    </label>
                    <input
                      value={editVehicleReq}
                      onChange={(e) => setEditVehicleReq(e.target.value)}
                      disabled={editSaving || editFieldsLocked}
                      className="w-full min-h-[44px] bg-card border border-border rounded-xl px-3 py-2.5 text-[15px] text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/60 transition-colors touch-manipulation disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Comms / radio
                    </label>
                    <input
                      value={editComms}
                      onChange={(e) => setEditComms(e.target.value)}
                      disabled={editSaving || editFieldsLocked}
                      className="w-full min-h-[44px] bg-card border border-border rounded-xl px-3 py-2.5 text-[15px] text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/60 transition-colors touch-manipulation disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Staging pin
                    </label>
                    {!editFieldsLocked ? (
                      <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">
                        Search an address or place to jump nearby, then drag the pin or tap the map. Use the layer
                        control (top-right) for satellite imagery.
                      </p>
                    ) : null}
                    {!editFieldsLocked ? (
                      <div className="flex gap-2 mb-2">
                        <input
                          className="w-full min-h-[44px] bg-card border border-border rounded-xl px-3 py-2.5 text-[15px] text-foreground placeholder-zinc-600 focus:outline-none focus:border-primary/60 transition-colors touch-manipulation flex-1 min-w-0"
                          placeholder="Address, intersection, or place…"
                          value={editAddressQuery}
                          onChange={(e) => setEditAddressQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void runEditAddressSearch();
                            }
                          }}
                          autoComplete="street-address"
                        />
                        <button
                          type="button"
                          onClick={() => void runEditAddressSearch()}
                          disabled={editGeocodeLoading}
                          className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-zinc-800 border border-border text-[14px] font-semibold text-foreground hover:bg-zinc-700 disabled:opacity-50 touch-manipulation"
                        >
                          {editGeocodeLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Search size={18} />
                          )}
                          Search
                        </button>
                      </div>
                    ) : null}
                    {!editFieldsLocked && editGeocodeResults.length > 0 ? (
                      <ul className="mb-2 max-h-36 overflow-y-auto rounded-xl border border-border bg-muted overscroll-contain divide-y divide-zinc-800/80">
                        {editGeocodeResults.map((r, i) => (
                          <li key={`${r.lat}-${r.lng}-${i}`}>
                            <button
                              type="button"
                              onClick={() => applyEditGeocodeHit(r)}
                              className="w-full text-left py-2.5 px-3 text-[13px] text-foreground/90 hover:bg-card active:bg-zinc-800 touch-manipulation leading-snug"
                            >
                              {r.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className={editFieldsLocked ? 'opacity-50 pointer-events-none' : ''}>
                      <MeetupMapPicker
                        center={editMapCenter}
                        position={[editMeetupLat, editMeetupLng]}
                        onPositionChange={(lat, lng) => {
                          setEditMeetupLat(lat);
                          setEditMeetupLng(lng);
                          setEditPinTouched(true);
                        }}
                        heightPx={360}
                        zoom={editZoom}
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Latitude (°)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min={-90}
                          max={90}
                          value={editMeetupLat}
                          disabled={editSaving || editFieldsLocked}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!Number.isFinite(v) || Math.abs(v) > 90) return;
                            setEditMeetupLat(v);
                            setEditPinTouched(true);
                          }}
                          className="w-full min-h-[44px] bg-card border border-border rounded-xl px-3 py-2.5 font-mono text-[13px] text-foreground focus:outline-none focus:border-primary/60 transition-colors touch-manipulation disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Longitude (°)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min={-180}
                          max={180}
                          value={editMeetupLng}
                          disabled={editSaving || editFieldsLocked}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!Number.isFinite(v) || Math.abs(v) > 180) return;
                            setEditMeetupLng(v);
                            setEditPinTouched(true);
                          }}
                          className="w-full min-h-[44px] bg-card border border-border rounded-xl px-3 py-2.5 font-mono text-[13px] text-foreground focus:outline-none focus:border-primary/60 transition-colors touch-manipulation disabled:opacity-50"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] font-mono text-muted-foreground">
                      {Number(editMeetupLat).toFixed(6)}, {Number(editMeetupLng).toFixed(6)}
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-3 border-t border-border flex gap-2">
                  <button
                    type="button"
                    disabled={editSaving}
                    onClick={() => setEditOpen(false)}
                    className="flex-1 min-h-[44px] rounded-xl border border-border text-foreground/90 font-bold hover:border-zinc-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={editSaving}
                    onClick={saveRunEdits}
                    className="flex-1 min-h-[44px] rounded-xl bg-primary text-primary-foreground font-black hover:bg-primary/90 disabled:opacity-50"
                  >
                    {editSaving ? 'Saving…' : editFieldsLocked ? 'Postpone run' : 'Save changes'}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
          className="bg-card border border-border rounded-2xl overflow-hidden"
        >
          {/* Flyer / poster (optional) */}
          {run.flyer_image && String(run.flyer_image).trim() ? (
            <div className="relative h-[220px] bg-muted">
              <img
                src={
                  ensureStoragePublicObjectUrl(String(run.flyer_image)) || String(run.flyer_image)
                }
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-transparent" />
            </div>
          ) : null}

          {/* Club + difficulty header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2 min-w-0">
              {run.club?.logo ? (
                <img
                  src={ensureStoragePublicObjectUrl(run.club.logo) || run.club.logo}
                  alt={run.club.name}
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Shield size={13} className="text-primary" />
                </div>
              )}
              {run.club ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-[13px] font-bold text-primary truncate">{run.club.name}</p>
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
                <p className="text-[13px] text-muted-foreground">Community / personal</p>
              )}
            </div>
            <span className={`flex-shrink-0 px-2.5 py-1 text-[11px] font-bold uppercase rounded-lg ${getDifficultyColor(run.difficulty)}`}>
              {run.difficulty}
            </span>
          </div>

          {/* Main info */}
          <div className="px-4 py-4 space-y-3">
            <h2 className="text-[20px] font-black text-foreground leading-snug">{run.title}</h2>

            {run.description && (
              <p className="text-[14px] text-muted-foreground leading-relaxed">{run.description}</p>
            )}

            {/* Host / club transparency */}
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{runAccountabilityHeading(run.run_source)}</p>
              {run.club_id && run.club ? (
                <Link
                  href={`/clubs/${run.club_id}`}
                  className="flex items-center gap-2.5 min-w-0 group"
                >
                  {run.club.logo ? (
                    <img
                      src={ensureStoragePublicObjectUrl(run.club.logo) || run.club.logo}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-border"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 border border-primary/30">
                      <Building2 size={16} className="text-primary/90" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground uppercase font-bold">Club listing</p>
                    <p className="text-[14px] font-bold text-foreground truncate group-hover:text-primary/90 transition-colors">
                      {run.club.name}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary/90 flex-shrink-0" />
                </Link>
              ) : run.run_source === 'club_official' ? (
                <p className="text-[13px] text-emerald-400/95 font-semibold">Official listing · Staff verified (no club page)</p>
              ) : null}
              {hostProfile && run.host_id ? (
                <Link
                  href={`/profile/${run.host_id}`}
                  className="flex items-center gap-2.5 min-w-0 group pt-1 border-t border-border/80"
                >
                  <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border border-border">
                    {hostProfile.avatar_url ? (
                      <img src={hostProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={16} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground uppercase font-bold">{runHostProfileHeading(run.run_source)}</p>
                    <p className="text-[14px] font-bold text-foreground truncate group-hover:text-primary/90 transition-colors">
                      {hostProfile.name ?? runHostFallbackName(run.run_source)}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary/90 flex-shrink-0" />
                </Link>
              ) : run.host_id ? (
                <Link
                  href={`/profile/${run.host_id}`}
                  className="text-[13px] text-primary font-semibold hover:text-primary/90 inline-flex items-center gap-1 pt-1 border-t border-border/80"
                >
                  {runHostProfileLinkText(run.run_source)} <ExternalLink size={14} />
                </Link>
              ) : null}
            </div>

            {/* Detail rows */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 text-[14px]">
                <Calendar size={15} className="text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{formatRunDate(run.date)}</span>
              </div>

              {(run.meetup_latitude != null && run.meetup_longitude != null) || run.meetup_location ? (
                <div className="flex items-start gap-2.5 text-[14px]">
                  <MapPin size={15} className="text-primary flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase text-muted-foreground mb-0.5">Staging area (recorded)</p>
                    {run.meetup_latitude != null && run.meetup_longitude != null ? (
                      <>
                        <p className="text-muted-foreground font-mono text-[13px]">
                          {Number(run.meetup_latitude).toFixed(5)}, {Number(run.meetup_longitude).toFixed(5)}
                        </p>
                        {stagingDirectionsUrl && (
                          <a
                            href={stagingDirectionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1 text-[12px] font-semibold text-primary hover:text-primary/90"
                          >
                            Open staging pin in Maps <ExternalLink size={12} />
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">{run.meetup_location}</span>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-2.5 text-[14px]">
                <Users size={15} className="text-primary flex-shrink-0" />
                <span className={isFull ? 'text-red-400' : 'text-muted-foreground'}>
                  {participants.length}
                  {run.max_participants != null ? `/${run.max_participants}` : ''} riders joined
                  {isFull && ' · Full'}
                </span>
              </div>

              {run.trail && run.trail_id && (
                <div className="flex items-center gap-2.5 text-[14px]">
                  <Mountain size={15} className="text-primary flex-shrink-0" />
                  <Link
                    href={`/trails/${run.trail_id}`}
                    className="text-muted-foreground hover:text-primary/90 transition-colors min-w-0"
                  >
                    <span className="font-semibold">{run.trail.name}</span>
                    {run.trail.difficulty && (
                      <span className="text-muted-foreground"> · {run.trail.difficulty}</span>
                    )}
                    <span className="sr-only"> — trail details</span>
                  </Link>
                </div>
              )}

              {run.vehicle_requirements && (
                <div className="flex items-start gap-2.5 text-[14px]">
                  <AlertTriangle size={15} className="text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{run.vehicle_requirements}</span>
                </div>
              )}

              {run.comms_note && String(run.comms_note).trim() && (
                <div className="flex items-start gap-2.5 text-[14px]">
                  <Radio size={15} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase text-muted-foreground mb-0.5">Comms / radio</p>
                    <span className="text-foreground/90 leading-snug break-words">{run.comms_note}</span>
                  </div>
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
                  className="flex items-center justify-center gap-2 py-3 bg-card border border-border hover:border-primary/40 text-foreground hover:text-foreground text-[14px] font-bold rounded-xl transition-colors"
                >
                  <Mountain size={15} className="text-primary" />
                  Directions to trail
                  <ExternalLink size={14} className="text-muted-foreground" />
                </a>
              )}
              {stagingDirectionsUrl && (
                <a
                  href={stagingDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 bg-card/80 border border-border hover:border-primary/35 text-muted-foreground hover:text-foreground text-[13px] font-semibold rounded-xl transition-colors"
                >
                  <MapPin size={15} className="text-primary" />
                  Directions to staging pin
                  <ExternalLink size={13} className="text-muted-foreground" />
                </a>
              )}
            </div>
          )}

          {runIsLive && !isHost && !joined && user && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <Zap size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-emerald-100/95 leading-snug">
                This run is <span className="font-bold text-emerald-300">live</span> — join to access group chat,
                the live map, and SOS while you are on trail.
              </p>
            </div>
          )}

          {run.status !== 'completed' && run.status !== 'cancelled' && (
            <div className="grid grid-cols-1 gap-3">
              {isHost ? (
                <div className="flex items-center justify-center gap-2 py-3 text-[14px] font-bold rounded-xl border border-primary/35 bg-primary/10 text-primary/80">
                  <Shield size={16} className="text-primary/90 flex-shrink-0" />
                  {runHostSelfDetailBadge(run.run_source)}
                </div>
              ) : (
                <button
                  onClick={handleRsvp}
                  disabled={(isFull && !joined) || joining}
                  className={`flex items-center justify-center gap-2 py-3 text-[14px] font-bold rounded-xl transition-colors ${
                    joined
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : isFull
                      ? 'bg-zinc-700 text-muted-foreground cursor-not-allowed'
                      : 'bg-primary hover:opacity-90 text-primary-foreground'
                  }`}
                >
                  {joining ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : joined ? (
                    <><CheckCircle2 size={16} /> Joined</>
                  ) : (
                    <><Zap size={16} /> {runJoinActionLabel(run.status, false)}</>
                  )}
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* ── Live map (active run — host + joined riders) ───────────────── */}
        {run.status === 'active' && canUseRunChat && supabaseClient && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
          >
            <RunLiveMap
              supabaseClient={supabaseClient}
              runId={run.id}
              user={user}
              participants={liveMapParticipants}
              referencePoint={liveMapReference}
              onToast={showToast}
            />
          </motion.div>
        )}

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
                      <Siren size={14} className="text-foreground" />
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
                      className="text-muted-foreground hover:text-muted-foreground transition-colors flex-shrink-0"
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
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-500 hover:bg-red-600 text-foreground text-[13px] font-black rounded-xl transition-colors mb-2"
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
            className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col max-h-[min(380px,52dvh)]"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/80 bg-card/80">
              <MessageCircle size={16} className="text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-foreground leading-none">Group chat</p>
                <p className="text-[11px] text-muted-foreground mt-1">Live updates for this run</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-[100px]">
              {chatMessages.length === 0 ? (
                <p className="text-center text-muted-foreground text-[13px] py-8 px-2">
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
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {(m.users?.name ?? 'R')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className={`min-w-0 max-w-[82%] ${mine ? 'text-right' : ''}`}>
                        <p className="text-[11px] text-muted-foreground mb-0.5">
                          {m.users?.name ?? 'Rider'}
                          <span className="text-muted-foreground mx-1">·</span>
                          {new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                        <p
                          className={`text-[13px] leading-snug rounded-xl px-3 py-2 inline-block text-left ${
                            mine
                              ? 'bg-primary/20 text-primary/60 border border-primary/25'
                              : 'bg-zinc-800 text-foreground/90 border border-border/80'
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
            <div className="border-t border-border bg-background/20 p-2 space-y-2">
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-thin">
                {RUN_GROUP_CHAT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => void handleSendChat(preset)}
                    disabled={chatSending}
                    className="flex-shrink-0 max-w-[min(240px,78vw)] text-left text-[11px] font-semibold text-foreground/90 bg-zinc-800/90 hover:bg-zinc-700 border border-border/80 rounded-lg px-2.5 py-1.5 leading-snug transition-colors disabled:opacity-50"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 px-1 pb-1">
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
                  className="flex-1 min-w-0 bg-muted border border-border rounded-xl px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  maxLength={2000}
                  aria-label="Group message"
                />
                <button
                  type="button"
                  onClick={() => void handleSendChat()}
                  disabled={chatSending || !chatInput.trim()}
                  className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-primary hover:opacity-90 text-primary-foreground disabled:bg-zinc-800 disabled:text-muted-foreground transition-colors"
                  aria-label="Send message"
                >
                  {chatSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
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
                className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40"
              />
              {/* Modal */}
              <motion.div
                key="sos-modal"
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                className="fixed bottom-0 left-0 right-0 z-50 max-w-app-shell mx-auto px-4 pb-8"
              >
                <div className="bg-muted border border-red-500/40 rounded-2xl p-5">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 mx-auto mb-4">
                    <Siren size={22} className="text-red-400" />
                  </div>
                  <h3 className="text-[17px] font-black text-foreground text-center mb-2">Send SOS Alert?</h3>
                  <p className="text-[13px] text-muted-foreground text-center leading-relaxed mb-5">
                    This will broadcast an emergency alert with your GPS location to everyone in this run. Only use for genuine emergencies.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSosConfirmOpen(false)}
                      className="py-3 bg-zinc-800 hover:bg-zinc-700 text-muted-foreground text-[14px] font-bold rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendSOS}
                      className="py-3 bg-red-500 hover:bg-red-600 text-foreground text-[14px] font-black rounded-xl transition-colors"
                    >
                      Send SOS
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Manage Run (host or platform staff) ───────────────────────── */}
        <AnimatePresence>
          {canManageRun && run.status !== 'cancelled' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <BadgeCheck size={15} className="text-primary" />
                <p className="text-[13px] font-bold text-muted-foreground">
                  {isHost
                    ? runHostControlsHeading(run.run_source)
                    : 'Staff controls'}
                </p>
              </div>

              {isStaff && !isHost && (
                <p className="text-[13px] text-muted-foreground">
                  Platform staff can start or wrap up this run on behalf of the host when they are unavailable.
                </p>
              )}

              {run.status === 'completed' && (
                <p className="text-[13px] text-muted-foreground">
                  This run is marked complete. You can remove the listing from the app when you no longer need it.
                </p>
              )}

              {run.status === 'upcoming' && (
                <>
                  <p className="text-[13px] text-muted-foreground">
                    {isHost
                      ? 'Runs start automatically at the scheduled time. Start early if the group is ready to roll now.'
                      : 'Runs start automatically at the scheduled time. Staff can start it early when the group is rolling.'}
                  </p>
                  <button
                    onClick={handleActivate}
                    disabled={activating || !!hostBusy}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 text-emerald-950 disabled:text-muted-foreground text-[14px] font-black rounded-xl transition-colors"
                  >
                    {activating ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Play size={15} />
                    )}
                    {activating
                      ? 'Activating…'
                      : isHost
                        ? runStartsInFuture ? 'Start run early' : 'Start run'
                        : runStartsInFuture ? 'Start run early (staff)' : 'Start run (staff)'}
                  </button>
                </>
              )}

              {run.status === 'active' && (
                <>
                  <p className="text-[13px] text-muted-foreground">
                    When everyone is back safe, mark complete. It closes chat and SOS for this event.
                  </p>
                  <button
                    onClick={handleCompleteRun}
                    disabled={!!hostBusy}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500/90 hover:bg-emerald-500 disabled:bg-zinc-700 text-emerald-950 disabled:text-muted-foreground text-[14px] font-black rounded-xl transition-colors"
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

              {isHost && (
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
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Participant list ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-primary" />
              <p className="text-[13px] font-bold text-foreground">Riders ({participants.length})</p>
            </div>
            {run.max_participants != null && (
              <p className="text-[12px] text-muted-foreground">{run.max_participants - participants.length} spots left</p>
            )}
          </div>

          {participants.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-muted-foreground text-[13px]">No riders yet — be the first!</p>
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
                        <User size={15} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-foreground truncate">
                      {p.users?.name ?? 'Rider'}
                      {run.host_id === p.user_id && (
                        <span className="ml-1.5 px-1.5 py-px text-[9px] font-black text-primary-foreground bg-primary rounded leading-none">
                          HOST
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    p.rsvp_status === 'going'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-zinc-700 text-muted-foreground'
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

        {/* ── Trip notes (completed runs — text only, no ratings) ───────── */}
        {run.status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.11 }}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60">
              <StickyNote size={15} className="text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-foreground leading-none">Trip notes</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Short write-ups from people who were on this run — helpful for the next group. No scores or leaderboards.
                </p>
              </div>
            </div>
            <div className="px-4 py-4 space-y-4">
              {runReflections.length === 0 ? (
                <p className="text-[13px] text-muted-foreground text-center py-2">
                  No notes yet{user && (joined || isHost) ? ' — add yours below.' : '.'}
                </p>
              ) : (
                <ul className="space-y-3">
                  {runReflections.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-border bg-muted/50 px-3 py-3"
                    >
                      <p className="text-[11px] text-muted-foreground mb-1.5">
                        {(r.users?.name ?? participants.find((p) => p.user_id === r.user_id)?.users?.name) ?? 'Rider'}
                        <span className="text-muted-foreground mx-1">·</span>
                        {new Date(r.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {r.updated_at !== r.created_at && (
                          <span className="text-muted-foreground"> · edited</span>
                        )}
                      </p>
                      <p className="text-[14px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{r.body}</p>
                    </li>
                  ))}
                </ul>
              )}

              {user && (joined || isHost) && (
                <div className="space-y-2 pt-1 border-t border-border/80">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide">
                    Your note
                  </label>
                  <textarea
                    value={reflectionBody}
                    onChange={(e) => {
                      reflectionTouchedRef.current = true;
                      setReflectionBody(e.target.value);
                    }}
                    placeholder="How were trail conditions, pacing, and the convoy? Anything the next crew should know."
                    rows={4}
                    maxLength={4000}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-y min-h-[100px]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveReflection()}
                    disabled={reflectionSaving || !reflectionBody.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:opacity-90 disabled:bg-zinc-800 text-primary-foreground disabled:text-muted-foreground text-[14px] font-bold rounded-xl transition-colors"
                  >
                    {reflectionSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                    {reflectionSaving ? 'Saving…' : 'Save trip note'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Safety reminder ───────────────────────────────────────────── */}
        <div className="flex items-start gap-2.5 px-3 py-3 bg-primary/8 border border-primary/20 rounded-xl">
          <AlertTriangle size={14} className="text-primary flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-primary/90/80 leading-relaxed">
            Always bring recovery gear, a first-aid kit, and ensure someone not on the run knows your itinerary.
          </p>
        </div>

      </main>

      <BottomNav />
    </div>
  );
}
