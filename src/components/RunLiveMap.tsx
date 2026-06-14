'use client';

/**
 * Live rider positions on an active run (opt-in). Loads Leaflet on the client only.
 * Requires RLS + realtime on public.user_locations.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import {
  getDeviceLocation,
  LocationAccessError,
  requestLocationAccess,
  watchDeviceLocation,
} from '@/lib/location/requestDeviceLocation';
import { upsertMyRunLocation } from '@/lib/location/upsertRunLocation';
import {
  LEAFLET_LAYERS_CONTROL_CLASS,
  LeafletBasemapLayers,
  MAP_BACKGROUND,
} from '@/lib/maps/leafletBasemaps';

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
  const stopWatchRef = useRef<(() => void) | null>(null);
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
    stopWatchRef.current?.();
    stopWatchRef.current = null;
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
    async (lat: number, lng: number, accuracy: number | null): Promise<boolean> => {
      if (!user) return false;
      const now = Date.now();
      if (now - lastPostRef.current < MIN_POST_INTERVAL_MS) return true;
      lastPostRef.current = now;

      const result = await upsertMyRunLocation(supabaseClient, {
        runId,
        latitude: lat,
        longitude: lng,
        accuracy,
      });
      if (!result.ok) {
        console.warn('user_locations upsert', result.message);
        onToast?.(result.message, 'error');
        return false;
      }
      return true;
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

    setShareBusy(true);
    try {
      // Native: explicit permission dialog. Web: browser prompt on getDeviceLocation.
      await requestLocationAccess();
      const first = await getDeviceLocation({ enableHighAccuracy: true, timeout: 12_000 });

      const posted = await postPosition(first.latitude, first.longitude, first.accuracy);
      if (!posted) {
        throw new LocationAccessError(
          'Could not save your location to this run. Make sure you joined the run, then try again.',
          'unknown'
        );
      }

      const watch = await watchDeviceLocation(
        (pos) => {
          void postPosition(pos.latitude, pos.longitude, pos.accuracy);
        },
        () => {
          onToast?.('Lost GPS signal — try again when you have a fix', 'info');
        },
        { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 }
      );
      stopWatchRef.current = watch.stop;

      setSharing(true);
      onToast?.('Sharing your position with this run (updates ~every 12s when moving)', 'success');
      void fetchLocations();
    } catch (err) {
      const message =
        err instanceof LocationAccessError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Allow location access to share with the group';
      onToast?.(message, 'error');
    } finally {
      setShareBusy(false);
    }
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
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/80">
        <Navigation size={16} className="text-primary flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-foreground leading-none">Live map</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Riders who opt in appear here when they have signal. Positions older than 45 minutes are hidden.
          </p>
        </div>
      </div>

      <div className={`h-[min(320px,55dvh)] w-full relative ${LEAFLET_LAYERS_CONTROL_CLASS}`}>
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%', background: MAP_BACKGROUND }}
          scrollWheelZoom
          zoomControl
        >
          <LeafletBasemapLayers />
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
                <div className="text-[12px] text-foreground/90 font-semibold">Trail / staging reference</div>
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
                      background: '#fff',
                      border: '1px solid #e4e4e7',
                      borderRadius: 10,
                      padding: '10px 12px',
                      minWidth: 160,
                    }}
                  >
                    <p style={{ color: '#18181b', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                      {nameByUserId.get(r.user_id) ?? 'Rider'}
                      {mine ? ' (you)' : ''}
                    </p>
                    <p style={{ color: '#71717a', fontSize: 11 }}>
                      Updated {formatAge(r.updated_at)}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {visibleRows.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/25 px-6">
            <p className="text-center text-[13px] text-muted-foreground font-medium">
              No live positions yet. Turn on sharing below when you are on the trail.
            </p>
          </div>
        )}
      </div>

      {user && (
        <div className="p-4 border-t border-border flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void handleToggleShare()}
            disabled={shareBusy}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold transition-colors ${
              sharing
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 hover:bg-emerald-500/25'
                : 'bg-primary hover:opacity-90 text-primary-foreground border border-primary/30'
            } disabled:opacity-60`}
          >
            {shareBusy ? <Loader2 size={17} className="animate-spin" /> : <MapPin size={17} />}
            {shareBusy ? 'Working…' : sharing ? 'Stop sharing my location' : 'Share my location'}
          </button>
          <p className="text-[11px] text-muted-foreground text-center leading-snug">
            Battery tip: sharing sends your GPS about every 12 seconds while this page is open.
          </p>
        </div>
      )}
    </div>
  );
}
