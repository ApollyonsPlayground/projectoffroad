'use client';

/**
 * Live rider positions on an active run (opt-in). Loads Leaflet on the client only.
 * Requires RLS + realtime on public.user_locations.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { Loader2, MapPin, Navigation } from 'lucide-react';

const STALE_MS = 45 * 60 * 1000;
const MIN_POST_INTERVAL_MS = 12_000;

export interface RunLiveMapParticipant {
  user_id: string;
  users: { name: string | null } | null;
}

export interface LiveLocationRow {
  id: string;
  run_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updated_at: string;
}

interface RunLiveMapProps {
  supabaseClient: SupabaseClient;
  runId: string;
  user: User | null;
  participants: RunLiveMapParticipant[];
  /** Trail head / staging — shown as a neutral reference pin when known */
  referencePoint: { lat: number; lng: number } | null;
  onToast?: (message: string, variant?: 'info' | 'success' | 'error') => void;
}

function hueForUserId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function formatAge(iso: string): string {
  const t = Date.now() - new Date(iso).getTime();
  if (t < 60_000) return 'just now';
  const m = Math.floor(t / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function FitBounds({
  points,
  reference,
}: {
  points: [number, number][];
  reference: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    const all: [number, number][] = [...points];
    if (reference) all.push(reference);
    if (all.length === 0) return;
    if (all.length === 1) {
      map.setView(all[0], 13);
      return;
    }
    const b = L.latLngBounds(all);
    map.fitBounds(b, { padding: [28, 28], maxZoom: 15 });
  }, [map, points, reference]);
  return null;
}

export default function RunLiveMap({
  supabaseClient,
  runId,
  user,
  participants,
  referencePoint,
  onToast,
}: RunLiveMapProps) {
  const [rows, setRows] = useState<LiveLocationRow[]>([]);
  const [sharing, setSharing] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastPostRef = useRef(0);

  const nameByUserId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of participants) {
      m.set(p.user_id, p.users?.name?.trim() || 'Rider');
    }
    return m;
  }, [participants]);

  const [visibleRows, setVisibleRows] = useState<LiveLocationRow[]>([]);

  const fetchLocations = useCallback(async () => {
    const { data, error } = await supabaseClient
      .from('user_locations')
      .select('id, run_id, user_id, latitude, longitude, accuracy, updated_at')
      .eq('run_id', runId);
    if (error) {
      console.warn('user_locations fetch', error.message);
      return;
    }
    setRows((data ?? []) as LiveLocationRow[]);
  }, [supabaseClient, runId]);

  useEffect(() => {
    void fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    const channel = supabaseClient
      .channel(`user-locations-${runId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_locations', filter: `run_id=eq.${runId}` },
        () => {
          void fetchLocations();
        }
      )
      .subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [supabaseClient, runId, fetchLocations]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const removeMyLocation = useCallback(async () => {
    if (!user) return;
    await supabaseClient.from('user_locations').delete().match({ run_id: runId, user_id: user.id });
  }, [supabaseClient, runId, user]);

  useEffect(() => {
    return () => {
      stopWatch();
    };
  }, [stopWatch]);

  const postPosition = useCallback(
    async (lat: number, lng: number, accuracy: number | null) => {
      if (!user) return;
      const now = Date.now();
      if (now - lastPostRef.current < MIN_POST_INTERVAL_MS) return;
      lastPostRef.current = now;
      const { error } = await supabaseClient.from('user_locations').upsert(
        {
          run_id: runId,
          user_id: user.id,
          latitude: lat,
          longitude: lng,
          accuracy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'run_id,user_id' }
      );
      if (error) {
        console.warn('user_locations upsert', error.message);
        onToast?.('Could not update your location. Check connection.', 'error');
      }
    },
    [supabaseClient, runId, user, onToast]
  );

  const handleToggleShare = async () => {
    if (!user) {
      onToast?.('Sign in to share your location', 'info');
      return;
    }
    if (sharing) {
      setShareBusy(true);
      stopWatch();
      await removeMyLocation();
      setRows((prev) => prev.filter((r) => r.user_id !== user.id));
      setSharing(false);
      setShareBusy(false);
      onToast?.('Stopped sharing your location', 'info');
      return;
    }

    if (!navigator.geolocation) {
      onToast?.('Location is not available in this browser', 'error');
      return;
    }

    setShareBusy(true);
    let first: GeolocationPosition;
    try {
      first = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12_000,
        });
      });
    } catch {
      onToast?.('Allow location access to share with the group', 'error');
      setShareBusy(false);
      return;
    }

    await postPosition(
      first.coords.latitude,
      first.coords.longitude,
      first.coords.accuracy ?? null
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        void postPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? null);
      },
      () => {
        onToast?.('Lost GPS signal — try again when you have a fix', 'info');
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 }
    );

    setSharing(true);
    setShareBusy(false);
    onToast?.('Sharing your position with this run (updates ~every 12s when moving)', 'success');
    void fetchLocations();
  };

  useEffect(() => {
    const apply = () => {
      const now = Date.now();
      setVisibleRows(rows.filter((r) => now - new Date(r.updated_at).getTime() <= STALE_MS));
    };
    apply();
    const id = window.setInterval(apply, 30_000);
    return () => clearInterval(id);
  }, [rows]);

  const markerPoints: [number, number][] = useMemo(
    () => visibleRows.map((r) => [Number(r.latitude), Number(r.longitude)] as [number, number]),
    [visibleRows]
  );

  const refLatLng: [number, number] | null = referencePoint
    ? [referencePoint.lat, referencePoint.lng]
    : null;

  const defaultCenter: [number, number] = refLatLng ?? markerPoints[0] ?? [34.05, -116.8];
  const defaultZoom = markerPoints.length === 0 && !refLatLng ? 9 : 12;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/80">
        <Navigation size={16} className="text-primary flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-white leading-none">Live map</p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Riders who opt in appear here when they have signal. Positions older than 45 minutes are hidden.
          </p>
        </div>
      </div>

      <div className="h-[min(320px,55dvh)] w-full relative">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%', background: '#18181b' }}
          scrollWheelZoom
          zoomControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds points={markerPoints} reference={refLatLng} />

          {refLatLng && (
            <CircleMarker
              center={refLatLng}
              radius={7}
              pathOptions={{
                color: '#71717a',
                weight: 2,
                fillColor: '#52525b',
                fillOpacity: 0.35,
              }}
            >
              <Popup className="run-live-map-popup" closeButton={false}>
                <div className="text-[12px] text-zinc-200 font-semibold">Trail / staging reference</div>
              </Popup>
            </CircleMarker>
          )}

          {visibleRows.map((r) => {
            const lat = Number(r.latitude);
            const lng = Number(r.longitude);
            const mine = user?.id === r.user_id;
            const hue = hueForUserId(r.user_id);
            const fill = `hsl(${hue} 72% 48%)`;
            return (
              <CircleMarker
                key={r.user_id}
                center={[lat, lng]}
                radius={mine ? 11 : 9}
                pathOptions={{
                  color: mine ? '#fff' : '#18181b',
                  weight: mine ? 2.5 : 1.5,
                  fillColor: fill,
                  fillOpacity: 0.92,
                }}
              >
                <Popup className="run-live-map-popup" closeButton={false}>
                  <div
                    style={{
                      background: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: 10,
                      padding: '10px 12px',
                      minWidth: 160,
                    }}
                  >
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                      {nameByUserId.get(r.user_id) ?? 'Rider'}
                      {mine ? ' (you)' : ''}
                    </p>
                    <p style={{ color: '#a1a1aa', fontSize: 11 }}>
                      Updated {formatAge(r.updated_at)}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {visibleRows.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 px-6">
            <p className="text-center text-[13px] text-zinc-400 font-medium">
              No live positions yet. Turn on sharing below when you are on the trail.
            </p>
          </div>
        )}
      </div>

      {user && (
        <div className="p-4 border-t border-zinc-800 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void handleToggleShare()}
            disabled={shareBusy}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold transition-colors ${
              sharing
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 hover:bg-emerald-500/25'
                : 'bg-primary hover:opacity-90 text-black border border-primary/30'
            } disabled:opacity-60`}
          >
            {shareBusy ? <Loader2 size={17} className="animate-spin" /> : <MapPin size={17} />}
            {shareBusy ? 'Working…' : sharing ? 'Stop sharing my location' : 'Share my location'}
          </button>
          <p className="text-[11px] text-zinc-600 text-center leading-snug">
            Battery tip: sharing sends your GPS about every 12 seconds while this page is open.
          </p>
        </div>
      )}
    </div>
  );
}
