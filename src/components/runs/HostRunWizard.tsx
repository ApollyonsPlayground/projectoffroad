'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Mountain,
  Flag,
  AlertTriangle,
  ChevronDown,
  Building2,
  Users,
  Info,
  Search,
  Radio,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { mapDbTrailRow, coordsFromRow } from '@/lib/trails/mapDbTrail';
import { fetchAllTrailRows } from '@/lib/trails/fetchTrailsPaginated';
import { isLimitedMediaDevice, resizeImageFileToJpegBlob } from '@/lib/media/mobileSafeCapture';

const MeetupMapPicker = dynamic(() => import('@/components/runs/MeetupMapPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] bg-zinc-900 animate-pulse rounded-xl border border-zinc-800" aria-hidden />
  ),
});

const DEFAULT_MAP_CENTER: [number, number] = [34.05, -116.8];

export type HostRunWizardVariant = 'drawer' | 'page';

const DIFFICULTIES = ['beginner', 'moderate', 'advanced', 'extreme'] as const;

/** Map wizard values to `runs.difficulty` CHECK (see schema.sql). */
const DIFFICULTY_FOR_DB: Record<(typeof DIFFICULTIES)[number], string> = {
  beginner: 'Easy',
  moderate: 'Moderate',
  advanced: 'Challenging',
  extreme: 'Extreme',
};

/** Staff official run with no `club_id` — listed as platform Staff verified. */
const STAFF_VERIFIED_NO_CLUB = '__staff_verified_no_club__';

interface TrailOption {
  id: string;
  name: string;
  location: string | null;
  difficulty: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coordinates?: string | null;
}

/** Align with Trail Explorer: DB may use `title`, `image_url`, etc. — avoid brittle column lists in `.select()`. */
function trailRowToPickerOption(row: Record<string, unknown>): TrailOption {
  const m = mapDbTrailRow(row);
  const c = coordsFromRow(row);
  const coordStr =
    typeof row.coordinates === 'string' && row.coordinates.trim()
      ? row.coordinates.trim()
      : m.coordinates ?? null;
  return {
    id: m.id,
    name: m.name,
    location: m.location || null,
    difficulty: m.difficulty || null,
    latitude: c?.lat ?? null,
    longitude: c?.lng ?? null,
    coordinates: coordStr,
  };
}

function parseTrailCoords(t: TrailOption | undefined): { lat: number; lng: number } | null {
  if (!t) return null;
  const latRaw = t.latitude ?? null;
  const lngRaw = t.longitude ?? null;
  if (latRaw != null && lngRaw != null) {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
  }
  const coordStr = t.coordinates;
  if (typeof coordStr === 'string' && coordStr.trim()) {
    const parts = coordStr.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
  }
  return null;
}

/** Map free-form trail directory difficulty strings onto wizard `DIFFICULTIES` values. */
function trailDifficultyToFormDifficulty(
  raw: string | null | undefined
): (typeof DIFFICULTIES)[number] {
  const s = (raw ?? '').toLowerCase().trim();
  if (!s) return 'moderate';
  if (/\b(extreme|expert)\b|double\s*black|sxs\s*only/i.test(s)) return 'extreme';
  if (/\b(advanced|hard|difficult|black|challenging)\b|level\s*5\b/i.test(s)) return 'advanced';
  if (/\b(moderate|intermediate|medium|blue)\b|level\s*[34]\b/i.test(s)) return 'moderate';
  if (/\b(beginner|easy|green|novice)\b|level\s*[12]\b/i.test(s)) return 'beginner';
  return 'moderate';
}

interface ClubOption {
  id: string;
  name: string;
  verified: boolean;
}

/** PostgREST may return `clubs` as an object or a one-element array depending on relationship metadata. */
function parseClubEmbed(raw: unknown): ClubOption | null {
  const o = Array.isArray(raw) ? raw[0] : raw;
  if (!o || typeof o !== 'object') return null;
  const x = o as { id?: unknown; name?: unknown; verified?: unknown };
  if (x.id == null) return null;
  return {
    id: String(x.id),
    name: String(x.name ?? 'Club'),
    verified: Boolean(x.verified),
  };
}

const EMPTY = {
  title: '',
  description: '',
  date: '',
  max_participants: '',
  difficulty: 'moderate',
  club_id: '',
  trail_id: '',
  vehicle_requirements: '',
  comms_note: '',
};

type HostRunFormState = typeof EMPTY;

const DRAFT_VERSION = 1 as const;

type StoredHostRunDraft = {
  v: typeof DRAFT_VERSION;
  savedAt: string;
  form: HostRunFormState;
  mode: 'club_official' | 'user_submitted';
  disclaimerAck: boolean;
  trailSearch: string;
  addressQuery: string;
  mapCenter: [number, number];
  meetupLat: number;
  meetupLng: number;
  mapZoom: number;
};

function hostRunDraftStorageKey(userId: string) {
  return `projectoffroad:host-run-draft:v${DRAFT_VERSION}:${userId}`;
}

function isDraftWorthSaving(snapshot: {
  form: HostRunFormState;
  mode: 'club_official' | 'user_submitted';
  disclaimerAck: boolean;
  trailSearch: string;
  addressQuery: string;
  meetupLat: number;
  meetupLng: number;
  mapCenter: [number, number];
  mapZoom: number;
}): boolean {
  const { form, mode, disclaimerAck, trailSearch, addressQuery, meetupLat, meetupLng, mapCenter, mapZoom } =
    snapshot;
  if (disclaimerAck) return true;
  if (trailSearch.trim() || addressQuery.trim()) return true;
  if (
    form.title.trim() ||
    form.description.trim() ||
    form.date.trim() ||
    form.trail_id ||
    form.club_id ||
    form.max_participants.trim() ||
    form.vehicle_requirements.trim() ||
    form.comms_note.trim()
  ) {
    return true;
  }
  if (form.difficulty !== EMPTY.difficulty) return true;
  if (mode !== 'club_official') return true;
  const ε = 1e-4;
  if (
    Math.abs(meetupLat - DEFAULT_MAP_CENTER[0]) > ε ||
    Math.abs(meetupLng - DEFAULT_MAP_CENTER[1]) > ε
  ) {
    return true;
  }
  if (
    Math.abs(mapCenter[0] - DEFAULT_MAP_CENTER[0]) > ε ||
    Math.abs(mapCenter[1] - DEFAULT_MAP_CENTER[1]) > ε
  ) {
    return true;
  }
  if (mapZoom !== 9) return true;
  return false;
}

function parseHostRunDraft(raw: string | null): StoredHostRunDraft | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<StoredHostRunDraft>;
    if (o.v !== DRAFT_VERSION || !o.form || typeof o.form !== 'object') return null;
    const f = o.form as Partial<HostRunFormState>;
    return {
      v: DRAFT_VERSION,
      savedAt: typeof o.savedAt === 'string' ? o.savedAt : new Date().toISOString(),
      form: {
        title: String(f.title ?? ''),
        description: String(f.description ?? ''),
        date: String(f.date ?? ''),
        max_participants: String(f.max_participants ?? ''),
        difficulty: DIFFICULTIES.includes(f.difficulty as (typeof DIFFICULTIES)[number])
          ? (f.difficulty as HostRunFormState['difficulty'])
          : EMPTY.difficulty,
        club_id: String(f.club_id ?? ''),
        trail_id: String(f.trail_id ?? ''),
        vehicle_requirements: String(f.vehicle_requirements ?? ''),
        comms_note: String(f.comms_note ?? ''),
      },
      mode: o.mode === 'user_submitted' ? 'user_submitted' : 'club_official',
      disclaimerAck: Boolean(o.disclaimerAck),
      trailSearch: String(o.trailSearch ?? ''),
      addressQuery: String(o.addressQuery ?? ''),
      mapCenter:
        Array.isArray(o.mapCenter) &&
        o.mapCenter.length === 2 &&
        Number.isFinite(Number(o.mapCenter[0])) &&
        Number.isFinite(Number(o.mapCenter[1]))
          ? [Number(o.mapCenter[0]), Number(o.mapCenter[1])]
          : DEFAULT_MAP_CENTER,
      meetupLat: typeof o.meetupLat === 'number' && Number.isFinite(o.meetupLat) ? o.meetupLat : DEFAULT_MAP_CENTER[0],
      meetupLng: typeof o.meetupLng === 'number' && Number.isFinite(o.meetupLng) ? o.meetupLng : DEFAULT_MAP_CENTER[1],
      mapZoom: typeof o.mapZoom === 'number' && Number.isFinite(o.mapZoom) ? o.mapZoom : 9,
    };
  } catch {
    return null;
  }
}

function writeHostRunDraft(userId: string, draft: StoredHostRunDraft) {
  try {
    localStorage.setItem(hostRunDraftStorageKey(userId), JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

function clearHostRunDraft(userId: string) {
  try {
    localStorage.removeItem(hostRunDraftStorageKey(userId));
  } catch {
    /* ignore */
  }
}

type Props = {
  variant?: HostRunWizardVariant;
  /** Called after a successful insert */
  onSuccess: () => void;
  onCancel?: () => void;
};

export function HostRunWizard({ variant = 'drawer', onSuccess, onCancel }: Props) {
  const { user, supabaseClient } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({ ...EMPTY });
  const [mode, setMode] = useState<'club_official' | 'user_submitted'>('club_official');
  /** Clubs where the user is owner/admin/leader (any verification status). */
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  /** All clubs from directory for staff (verified + unverified); optional link on official runs. */
  const [staffDirectoryClubs, setStaffDirectoryClubs] = useState<ClubOption[]>([]);
  const [trails, setTrails] = useState<TrailOption[]>([]);
  const [trailSearch, setTrailSearch] = useState('');
  const [disclaimerAck, setDisclaimerAck] = useState(false);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreviewUrl, setFlyerPreviewUrl] = useState('');
  const [clubOnly, setClubOnly] = useState(false);
  /** Loaded from DB so we do not depend on AuthContext `profile` timing (fixes disabled Club run for admins). */
  const [staffFromDb, setStaffFromDb] = useState(false);

  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [meetupLat, setMeetupLat] = useState<number>(DEFAULT_MAP_CENTER[0]);
  const [meetupLng, setMeetupLng] = useState<number>(DEFAULT_MAP_CENTER[1]);
  const [mapZoom, setMapZoom] = useState(9);
  const [pinTouched, setPinTouched] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState<{ lat: number; lng: number; label: string }[]>(
    []
  );

  useEffect(() => {
    if (!user || !supabaseClient) return;
    let cancelled = false;
    setLoadingDropdowns(true);

    void (async () => {
      const [{ data: roleRow }, membersRes] = await Promise.all([
        supabaseClient.from('users').select('role').eq('id', user.id).maybeSingle(),
        supabaseClient
          .from('club_members')
          .select('club_id, role, status, clubs(id, name, verified)')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .in('role', ['owner', 'admin', 'officer', 'leader']),
      ]);

      if (cancelled) return;

      let trailRows: Record<string, unknown>[] = [];
      let trailsFetchFailed = false;
      try {
        trailRows = await fetchAllTrailRows(supabaseClient);
      } catch (trailsErr) {
        trailsFetchFailed = true;
        console.error('[HostRunWizard] trails fetch', trailsErr);
      }

      const staff = ['owner', 'admin'].includes(String(roleRow?.role ?? '').toLowerCase());
      setStaffFromDb(staff);

      const list: ClubOption[] = [];
      for (const row of membersRes.data ?? []) {
        const c = parseClubEmbed((row as { clubs?: unknown }).clubs);
        if (!c) continue;
        if (!list.some((x) => x.id === c.id)) list.push(c);
      }
      setClubs(list);

      let dirList: ClubOption[] = [];
      if (staff) {
        let r = await supabaseClient
          .from('clubs')
          .select('id, name, verified')
          .order('name', { ascending: true })
          .limit(400);
        if (r.error) {
          r = await supabaseClient.from('clubs').select('id, name').order('name', { ascending: true }).limit(400);
          if (!r.error && r.data?.length) {
            dirList = (r.data as { id: string; name: string }[]).map((row) => ({
              id: row.id,
              name: row.name,
              verified: false,
            }));
          }
        } else if (r.data?.length) {
          dirList = (r.data as { id: string; name: string; verified?: boolean | null }[]).map((row) => ({
            id: row.id,
            name: row.name,
            verified: row.verified === true,
          }));
        }
      }
      setStaffDirectoryClubs(dirList);

      if (trailsFetchFailed) {
        setTrails([]);
        showToast('Could not load trails — check connection or try Trail Explorer', 'error');
      } else {
        setTrails(
          trailRows
            .map(trailRowToPickerOption)
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
        );
      }
      if (!cancelled) setLoadingDropdowns(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, supabaseClient]);

  /** Non-staff official runs: verified clubs where user is leader. */
  const officialClubChoices = useMemo(() => clubs.filter((c) => c.verified), [clubs]);

  /** Staff: union directory + membership for optional club link (any verification status). */
  const staffOfficialClubOptions = useMemo(() => {
    const byId = new Map<string, ClubOption>();
    for (const c of staffDirectoryClubs) byId.set(c.id, c);
    for (const c of clubs) {
      if (!byId.has(c.id)) byId.set(c.id, c);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [staffDirectoryClubs, clubs]);

  const canPickClubOfficial = staffFromDb || officialClubChoices.length > 0;

  useEffect(() => {
    if (
      officialClubChoices.length === 0 &&
      mode === 'club_official' &&
      !staffFromDb
    ) {
      setMode('user_submitted');
    }
  }, [officialClubChoices.length, mode, staffFromDb]);

  /** Default staff official runs to Staff verified (sentinel) so the select always matches an option. */
  useEffect(() => {
    if (!staffFromDb || mode !== 'club_official') return;
    setForm((f) => {
      if (f.club_id && f.club_id !== '') return f;
      return { ...f, club_id: STAFF_VERIFIED_NO_CLUB };
    });
  }, [staffFromDb, mode]);

  const filteredTrails = useMemo(() => {
    const q = trailSearch.trim().toLowerCase();
    if (!q) return trails;
    return trails.filter((t) => {
      const blob = `${t.name} ${t.location ?? ''} ${t.difficulty ?? ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [trails, trailSearch]);

  /** Latest wizard snapshot for debounced / unmount draft saves */
  const draftSnapshotRef = useRef({
    form,
    mode,
    disclaimerAck,
    trailSearch,
    addressQuery,
    mapCenter,
    meetupLat,
    meetupLng,
    mapZoom,
  });
  draftSnapshotRef.current = {
    form,
    mode,
    disclaimerAck,
    trailSearch,
    addressQuery,
    mapCenter,
    meetupLat,
    meetupLng,
    mapZoom,
  };

  /** Restore draft when opening Host a Run (drawer or full page). */
  useEffect(() => {
    if (!user?.id) return;
    const d = parseHostRunDraft(localStorage.getItem(hostRunDraftStorageKey(user.id)));
    if (!d) return;
    setForm(d.form);
    setMode(d.mode);
    setDisclaimerAck(d.disclaimerAck);
    setTrailSearch(d.trailSearch);
    setAddressQuery(d.addressQuery);
    setMapCenter(d.mapCenter);
    setMeetupLat(d.meetupLat);
    setMeetupLng(d.meetupLng);
    setMapZoom(d.mapZoom);
  }, [user?.id]);

  /** Debounced localStorage draft */
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    const handle = window.setTimeout(() => {
      const s = draftSnapshotRef.current;
      if (!isDraftWorthSaving(s)) {
        clearHostRunDraft(uid);
        return;
      }
      const draft: StoredHostRunDraft = {
        v: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        form: s.form,
        mode: s.mode,
        disclaimerAck: s.disclaimerAck,
        trailSearch: s.trailSearch,
        addressQuery: s.addressQuery,
        mapCenter: s.mapCenter,
        meetupLat: s.meetupLat,
        meetupLng: s.meetupLng,
        mapZoom: s.mapZoom,
      };
      writeHostRunDraft(uid, draft);
    }, 450);
    return () => window.clearTimeout(handle);
  }, [
    user?.id,
    form,
    mode,
    disclaimerAck,
    trailSearch,
    addressQuery,
    mapCenter,
    meetupLat,
    meetupLng,
    mapZoom,
  ]);

  /** Flush draft when leaving the page or closing the drawer (before debounce fires). */
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    const flush = () => {
      const s = draftSnapshotRef.current;
      if (!isDraftWorthSaving(s)) {
        clearHostRunDraft(uid);
        return;
      }
      writeHostRunDraft(uid, {
        v: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        form: s.form,
        mode: s.mode,
        disclaimerAck: s.disclaimerAck,
        trailSearch: s.trailSearch,
        addressQuery: s.addressQuery,
        mapCenter: s.mapCenter,
        meetupLat: s.meetupLat,
        meetupLng: s.meetupLng,
        mapZoom: s.mapZoom,
      });
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [user?.id]);

  const set =
    (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const inputClass =
    'w-full min-h-[44px] bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-[15px] text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/60 transition-colors touch-manipulation';
  const labelClass = 'block text-[12px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5';

  const applyGeocodeHit = (r: { lat: number; lng: number }) => {
    setMapCenter([r.lat, r.lng]);
    setMeetupLat(r.lat);
    setMeetupLng(r.lng);
    setMapZoom(15);
    setGeocodeResults([]);
    setPinTouched(true);
  };

  const runAddressSearch = async () => {
    const q = addressQuery.trim();
    if (q.length < 3) {
      showToast('Type at least 3 characters to search', 'error');
      return;
    }
    setGeocodeLoading(true);
    setGeocodeResults([]);
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
      setGeocodeResults(results);
    } catch {
      showToast('Search failed', 'error');
    } finally {
      setGeocodeLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabaseClient) return;
    if (!form.title.trim() || !form.date) {
      showToast('Fill in title and date', 'error');
      return;
    }
    if (
      !Number.isFinite(meetupLat) ||
      !Number.isFinite(meetupLng) ||
      Math.abs(meetupLat) > 90 ||
      Math.abs(meetupLng) > 180
    ) {
      showToast('Place the staging-area pin on the map', 'error');
      return;
    }
    // Prevent accidental default pin saves (common source of “staging moved” reports).
    if (!pinTouched) {
      showToast('Tap the map or drag the pin to set the staging area', 'error');
      return;
    }

    if (mode === 'club_official') {
      if (!staffFromDb) {
        if (!form.club_id) {
          showToast('Select the verified club hosting this run', 'error');
          return;
        }
        const ok = officialClubChoices.some((c) => c.id === form.club_id);
        if (!ok) {
          showToast('Pick a verified club from the list', 'error');
          return;
        }
      }
    } else {
      if (!disclaimerAck) {
        showToast('Accept the community run notice to continue', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const row: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        date: new Date(form.date).toISOString(),
        meetup_latitude: meetupLat,
        meetup_longitude: meetupLng,
        meetup_location: `Staging pin · ${meetupLat.toFixed(5)}, ${meetupLng.toFixed(5)}`,
        max_participants: form.max_participants ? parseInt(form.max_participants, 10) : null,
        difficulty: DIFFICULTY_FOR_DB[form.difficulty as (typeof DIFFICULTIES)[number]] ?? form.difficulty,
        trail_id: form.trail_id || null,
        vehicle_requirements: form.vehicle_requirements.trim() || null,
        comms_note: form.comms_note.trim() || null,
        host_id: user.id,
        status: 'upcoming',
        run_source: mode,
        // Staff verified without a club has no member list to gate, so force public.
        visibility:
          mode === 'club_official' &&
          !staffFromDb &&
          form.club_id &&
          clubOnly
            ? 'club_only'
            : 'public',
      };

      if (mode === 'club_official') {
        if (staffFromDb) {
          const cid = form.club_id;
          if (!cid || cid === STAFF_VERIFIED_NO_CLUB) {
            row.club_id = null;
          } else {
            const allowed =
              staffOfficialClubOptions.some((c) => c.id === cid) || clubs.some((c) => c.id === cid);
            if (!allowed) {
              showToast('Pick Staff verified or a club from the list', 'error');
              return;
            }
            row.club_id = cid;
          }
        } else {
          row.club_id = form.club_id;
        }
        row.user_acknowledged_disclaimer_at = null;
      } else {
        row.club_id = form.club_id || null;
        row.user_acknowledged_disclaimer_at = new Date().toISOString();
      }

      const { data: createdRun, error } = await supabaseClient
        .from('runs')
        .insert(row)
        .select('id')
        .single();
      if (error) {
        if (
          error.message?.includes('run_source') ||
          error.message?.includes('user_acknowledged') ||
          error.message?.includes('host_id') ||
          error.message?.includes('meetup_latitude') ||
          error.message?.includes('meetup_longitude') ||
          error.message?.includes('comms_note')
        ) {
          showToast(
            'Database needs the latest migrations (runs workflow + meetup coordinates). Run npm run db:push.',
            'error'
          );
        }
        throw error;
      }

      const createdRunId = createdRun?.id ? String(createdRun.id) : '';
      if (flyerFile && createdRunId) {
        try {
          const maxEdge = isLimitedMediaDevice() ? 1400 : 2200;
          const blob = await resizeImageFileToJpegBlob(flyerFile, maxEdge, 0.88);
          const path = `${createdRunId}/${crypto.randomUUID()}.jpg`;
          const { error: upErr } = await supabaseClient.storage
            .from('run-flyers')
            .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
          if (!upErr) {
            const { data: pub } = supabaseClient.storage.from('run-flyers').getPublicUrl(path);
            const publicUrl = pub?.publicUrl ? String(pub.publicUrl) : '';
            if (publicUrl) {
              await supabaseClient.from('runs').update({ flyer_image: publicUrl }).eq('id', createdRunId);
            }
          }
        } catch {
          // Run is already created; flyer upload failure shouldn't block publishing.
        }
      }
      showToast(
        mode === 'club_official' ? 'Official Club Run published' : 'Community Run published',
        'success'
      );
      clearHostRunDraft(user.id);
      setForm({ ...EMPTY });
      setDisclaimerAck(false);
      setFlyerFile(null);
      if (flyerPreviewUrl) URL.revokeObjectURL(flyerPreviewUrl);
      setFlyerPreviewUrl('');
      setClubOnly(false);
      setTrailSearch('');
      setAddressQuery('');
      setGeocodeResults([]);
      setMapZoom(9);
      setMapCenter(DEFAULT_MAP_CENTER);
      setMeetupLat(DEFAULT_MAP_CENTER[0]);
      setMeetupLng(DEFAULT_MAP_CENTER[1]);
      setPinTouched(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create run';
      if (!String(msg).includes('migration')) showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!flyerFile) {
      if (flyerPreviewUrl) URL.revokeObjectURL(flyerPreviewUrl);
      setFlyerPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(flyerFile);
    if (flyerPreviewUrl) URL.revokeObjectURL(flyerPreviewUrl);
    setFlyerPreviewUrl(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyerFile]);

  const pad = variant === 'page' ? 'px-4 py-4 max-w-app-shell mx-auto' : 'px-4 py-4';

  return (
    <form onSubmit={handleSubmit} className={`${pad} space-y-4`}>
      {/* Run type — large touch targets */}
      <div>
        <p className={labelClass}>Run type</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={loadingDropdowns || !canPickClubOfficial}
            onClick={() => {
              setMode('club_official');
              setDisclaimerAck(false);
              setClubOnly(false);
              setForm((f) =>
                staffFromDb ? { ...f, club_id: STAFF_VERIFIED_NO_CLUB } : { ...f, club_id: '' }
              );
            }}
            className={`flex flex-col items-center justify-center gap-1.5 min-h-[88px] rounded-xl border-2 transition-colors touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed ${
              mode === 'club_official'
                ? 'border-orange-500 bg-orange-500/10 text-white'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 active:bg-zinc-800'
            }`}
          >
            <Building2 size={22} className={mode === 'club_official' ? 'text-orange-400' : ''} />
            <span className="text-[13px] font-bold text-center leading-tight">Club Run</span>
            <span className="text-[10px] text-zinc-500 text-center leading-tight px-1">
              {staffFromDb
                ? 'Staff verified · official listing'
                : 'Verified club · listed as official'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('user_submitted');
              setForm((f) => ({ ...f, club_id: '' }));
              setClubOnly(false);
            }}
            className={`flex flex-col items-center justify-center gap-1.5 min-h-[88px] rounded-xl border-2 transition-colors touch-manipulation ${
              mode === 'user_submitted'
                ? 'border-amber-500 bg-amber-500/10 text-white'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 active:bg-zinc-800'
            }`}
          >
            <Users size={22} className={mode === 'user_submitted' ? 'text-amber-400' : ''} />
            <span className="text-[13px] font-bold text-center leading-tight">Community Run</span>
            <span className="text-[10px] text-zinc-500 text-center leading-tight px-1">
              Not verified · extra notices apply
            </span>
          </button>
        </div>
        {!staffFromDb && officialClubChoices.length === 0 && !loadingDropdowns && (
          <p className="mt-2 flex items-start gap-2 text-[12px] text-amber-200/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              You are not a leader of a verified club yet. You can still post a{' '}
              <strong>Community Run</strong>, or create/join a club and wait for verification.
            </span>
          </p>
        )}
        {staffFromDb && staffDirectoryClubs.length === 0 && !loadingDropdowns && (
          <p className="mt-2 flex items-start gap-2 text-[12px] text-emerald-200/90 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-3 py-2">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              No clubs loaded from the directory (check RLS on <strong>clubs</strong>). You can still publish
              as <strong>Staff verified</strong> without a club. Optionally link a club when the directory loads.
            </span>
          </p>
        )}
      </div>

      {mode === 'user_submitted' && (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-3 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-[13px] text-amber-100/95 leading-relaxed">
              <p className="font-bold text-amber-200 mb-1">Community-run notice</p>
              <p className="mb-2">
                This event is <strong>not</strong> organized or verified by SoCalOffroaders or a verified
                club. Meetups are between individuals; trail conditions and difficulty can change; you are
                responsible for your own safety, vehicle, and compliance with land-use rules.
              </p>
              <p className="text-[12px] text-amber-200/80">
                See{' '}
                <Link href="/terms" className="underline font-semibold text-amber-300">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/guidelines" className="underline font-semibold text-amber-300">
                  Guidelines
                </Link>
                .
              </p>
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer touch-manipulation min-h-[44px]">
            <input
              type="checkbox"
              checked={disclaimerAck}
              onChange={(e) => setDisclaimerAck(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-zinc-600 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-[13px] text-zinc-200 leading-snug">
              I understand this is a community listing, not a verified club run, and I accept responsibility
              as host.
            </span>
          </label>
        </div>
      )}

      {mode === 'club_official' && (
        <p className="flex items-center gap-2 text-[12px] text-emerald-400/95 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-3 py-2">
          <Building2 size={14} className="flex-shrink-0" />
          {staffFromDb ? (
            <span>
              <strong>Staff verified</strong> official listing — no verified hosting club required. Optionally
              attach any club below for attribution.
            </span>
          ) : (
            <span>
              Official club runs are published immediately for your verified club (no separate approval step).
            </span>
          )}
        </p>
      )}

      {/* Visibility: public vs members-only */}
      {mode === 'club_official' && !staffFromDb && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-3 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Visibility</p>
          <label className="flex items-start gap-3 text-[13px] text-zinc-300">
            <input
              type="checkbox"
              className="mt-1"
              checked={clubOnly}
              onChange={(e) => setClubOnly(e.target.checked)}
            />
            <span>
              <strong className="text-white">Club members only</strong>
              <span className="block text-[12px] text-zinc-500 mt-0.5">
                Only approved members of the hosting club can see this run.
              </span>
            </span>
          </label>
        </div>
      )}

      {/* Title */}
      <div>
        <label className={labelClass}>Title *</label>
        <input
          className={inputClass}
          placeholder="e.g. Big Bear shakedown"
          value={form.title}
          onChange={set('title')}
          required
          autoComplete="off"
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Description</label>
        <textarea
          className={`${inputClass} resize-none min-h-[100px]`}
          rows={3}
          placeholder="Conditions, bring-list, radio channel…"
          value={form.description}
          onChange={set('description')}
        />
      </div>

      {/* Flyer / poster */}
      <div>
        <label className={labelClass}>
          <ImageIcon size={12} className="inline mr-1" />
          Run flyer / poster (optional)
        </label>
        <div className="space-y-2">
          <input
            type="file"
            accept="image/*"
            className={inputClass}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFlyerFile(f);
            }}
          />
          {flyerPreviewUrl ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
              <img
                src={flyerPreviewUrl}
                alt="Flyer preview"
                className="w-full max-h-[280px] object-cover"
              />
              <button
                type="button"
                onClick={() => setFlyerFile(null)}
                className="w-full flex items-center justify-center gap-2 py-2 text-[12px] font-bold text-zinc-300 hover:text-white border-t border-zinc-800 bg-zinc-950/40"
              >
                <X size={14} />
                Remove flyer
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-zinc-500">
              Adds a poster image to the run card and run detail page.
            </p>
          )}
        </div>
      </div>

      {/* Date / Time */}
      <div>
        <label className={labelClass}>Date & time *</label>
        <input
          type="datetime-local"
          className={`${inputClass} [color-scheme:dark]`}
          value={form.date}
          onChange={set('date')}
          required
        />
      </div>

      {/* Trail — searchable touch list */}
      <div>
        <label className={labelClass}>
          <Mountain size={12} className="inline mr-1" />
          Trail from directory
        </label>
        <input
          type="search"
          className={inputClass}
          placeholder="Search trails by name or area…"
          value={trailSearch}
          onChange={(e) => setTrailSearch(e.target.value)}
          disabled={loadingDropdowns}
          autoComplete="off"
        />
        <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 overscroll-contain">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, trail_id: '' }))}
            className={`w-full text-left py-3.5 px-3 text-[14px] touch-manipulation border-b border-zinc-800/80 ${
              !form.trail_id ? 'bg-orange-500/15 text-orange-300' : 'text-zinc-300 active:bg-zinc-900'
            }`}
          >
            No trail selected — meetup only
          </button>
          {filteredTrails.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                const d = trailDifficultyToFormDifficulty(t.difficulty);
                setForm((f) => ({ ...f, trail_id: t.id, difficulty: d }));
                const c = parseTrailCoords(t);
                if (c) {
                  setMapCenter([c.lat, c.lng]);
                  setMeetupLat(c.lat);
                  setMeetupLng(c.lng);
                  setMapZoom(12);
                }
              }}
              className={`w-full text-left py-3.5 px-3 text-[14px] touch-manipulation border-b border-zinc-800/80 last:border-0 ${
                form.trail_id === t.id
                  ? 'bg-orange-500/15 text-orange-300'
                  : 'text-zinc-200 active:bg-zinc-900'
              }`}
            >
              <span className="font-semibold block">{t.name}</span>
              <span className="text-[12px] text-zinc-500">
                {[t.location, t.difficulty].filter(Boolean).join(' · ') || 'Trail'}
              </span>
            </button>
          ))}
          {filteredTrails.length === 0 && (
            <p className="py-6 px-3 text-[13px] text-zinc-500 text-center">No trails match that search.</p>
          )}
        </div>
      </div>

      {/* Difficulty + max */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Difficulty</label>
            <div className="relative">
              <select
                className={`${inputClass} appearance-none pr-10`}
                value={form.difficulty}
                onChange={set('difficulty')}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d} className="bg-zinc-900 capitalize">
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Max rigs</label>
            <input
              type="number"
              min={1}
              max={200}
              className={inputClass}
              placeholder="Open"
              value={form.max_participants}
              onChange={set('max_participants')}
            />
          </div>
        </div>
        {form.trail_id ? (
          <p className="text-[11px] text-zinc-500 leading-snug">
            Pulled from the trail listing when you pick a trail — change if this run is easier or harder.
          </p>
        ) : null}
      </div>

      {/* Staging pin (exact coordinates — transparency / liability) */}
      <div>
        <label className={labelClass}>Staging / meetup pin *</label>
        <p className="text-[12px] text-zinc-500 leading-relaxed mb-2">
          Search an address or place to jump nearby, then drag the pin or tap the map for the exact staging spot.
          We store coordinates so hosts and riders share the same reference point.
        </p>
        <div className="flex gap-2 mb-2">
          <input
            className={`${inputClass} flex-1 min-w-0`}
            placeholder="Address, intersection, or place…"
            value={addressQuery}
            onChange={(e) => setAddressQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void runAddressSearch();
              }
            }}
            autoComplete="street-address"
          />
          <button
            type="button"
            onClick={() => void runAddressSearch()}
            disabled={geocodeLoading}
            className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-[14px] font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 touch-manipulation"
          >
            {geocodeLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Search
          </button>
        </div>
        {geocodeResults.length > 0 && (
          <ul className="mb-2 max-h-36 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 overscroll-contain divide-y divide-zinc-800/80">
            {geocodeResults.map((r, i) => (
              <li key={`${r.lat}-${r.lng}-${i}`}>
                <button
                  type="button"
                  onClick={() => applyGeocodeHit(r)}
                  className="w-full text-left py-2.5 px-3 text-[13px] text-zinc-200 hover:bg-zinc-900 active:bg-zinc-800 touch-manipulation leading-snug"
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <MeetupMapPicker
          center={mapCenter}
          position={[meetupLat, meetupLng]}
          onPositionChange={(lat, lng) => {
            setMeetupLat(lat);
            setMeetupLng(lng);
            setPinTouched(true);
          }}
          heightPx={240}
          zoom={mapZoom}
        />
        <p className="mt-2 text-[11px] font-mono text-zinc-500">
          {meetupLat.toFixed(5)}, {meetupLng.toFixed(5)}
        </p>
      </div>

      {/* Vehicle requirements */}
      <div>
        <label className={labelClass}>Vehicle / gear notes</label>
        <input
          className={inputClass}
          placeholder="e.g. 33″ tires, recovery gear"
          value={form.vehicle_requirements}
          onChange={set('vehicle_requirements')}
        />
      </div>

      {/* Radio / comms — GMRS, FRS, tone (local trail nets) */}
      <div>
        <label className={labelClass}>
          <Radio size={12} className="inline mr-1 opacity-90" />
          Comms / radio (optional)
        </label>
        <input
          className={inputClass}
          placeholder="e.g. GMRS ch 22 · tone 67.0 · call sign or net name"
          value={form.comms_note}
          onChange={set('comms_note')}
          autoComplete="off"
          maxLength={300}
        />
        <p className="mt-1.5 text-[11px] text-zinc-500 leading-snug">
          Shown on the run card so everyone tunes the same channel before rollout — not a rating or leaderboard.
        </p>
      </div>

      {/* Club (official + staff: optional Staff verified; official + member: required verified; community: optional) */}
      <div>
        <label className={labelClass}>
          {mode === 'club_official' ? (
            <>{staffFromDb ? 'Club (optional)' : 'Verified hosting club *'}</>
          ) : (
            <>Club affiliation (optional)</>
          )}
          {loadingDropdowns && (
            <Loader2 size={11} className="inline ml-1.5 animate-spin text-zinc-500" />
          )}
        </label>
        <div className="relative">
          <select
            className={`${inputClass} appearance-none pr-10`}
            value={form.club_id}
            onChange={set('club_id')}
            disabled={
              loadingDropdowns ||
              (mode === 'club_official' && officialClubChoices.length === 0 && !staffFromDb)
            }
            required={mode === 'club_official' && !staffFromDb}
          >
            {mode === 'club_official' ? (
              staffFromDb ? (
                <>
                  <option value={STAFF_VERIFIED_NO_CLUB}>Staff verified — official (no club)</option>
                  {staffOfficialClubOptions.map((c) => (
                    <option key={c.id} value={c.id} className="bg-zinc-900">
                      {c.name}
                      {c.verified ? ' · verified club' : ' · not verified'}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value="">Select verified club…</option>
                  {officialClubChoices.map((c) => (
                    <option key={c.id} value={c.id} className="bg-zinc-900">
                      {c.name}
                    </option>
                  ))}
                </>
              )
            ) : (
              <>
                <option value="">No club — personal / friends meetup</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900">
                    {c.name}
                    {!c.verified ? ' (not verified)' : ''}
                  </option>
                ))}
              </>
            )}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 min-h-[48px] py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 text-black disabled:text-zinc-500 text-[15px] font-black rounded-xl transition-colors touch-manipulation"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <Flag size={18} />}
          {submitting ? 'Publishing…' : 'Publish run'}
        </button>
        {onCancel && variant === 'drawer' && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[44px] py-2.5 text-[14px] font-semibold text-zinc-400 hover:text-white touch-manipulation"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="h-2" aria-hidden />
    </form>
  );
}
