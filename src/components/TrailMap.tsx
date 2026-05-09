'use client';

/**
 * TrailMap — Discovery Map powered by react-leaflet.
 * Renders colored circle markers for trails that have coordinates (DB lat/lng or parseable `coordinates` / coord-style Maps URLs).
 * Requests browser geolocation once for "you are here" + a control to recenter.
 */

import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  rawDifficultyToTier,
  type DifficultyTier,
  type ExplorerTrail,
} from '@/lib/trails/mapDbTrail';

interface TrailMapProps {
  trails: ExplorerTrail[];
  /** Trails matching current filters (list count). */
  totalInView: number;
}

/** Parse "34.3031, -117.4524" into [lat, lng]. Returns null if invalid. */
function parseCoords(trail: ExplorerTrail): [number, number] | null {
  if (trail.mapLat != null && trail.mapLng != null) {
    const lat = Number(trail.mapLat);
    const lng = Number(trail.mapLng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return [lat, lng];
  }
  if (trail.coordinates) {
    const parts = trail.coordinates.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      return [parts[0], parts[1]];
    }
  }
  if (trail.mapsUrl) {
    const match = trail.mapsUrl.match(/query=([-\d.]+),([-\d.]+)/);
    if (match) return [parseFloat(match[1]), parseFloat(match[2])];
  }
  return null;
}

function tierForTrail(trail: ExplorerTrail): DifficultyTier {
  return trail.difficultyLabel ?? rawDifficultyToTier(trail.difficulty || trail.difficultyLevel || '');
}

function getTierColor(tier: DifficultyTier): string {
  if (tier === 'Easy') return '#22c55e';
  if (tier === 'Moderate') return '#eab308';
  return '#ef4444';
}

function AutoGeolocate({
  onLocated,
}: {
  onLocated: (pos: [number, number]) => void;
}) {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocated([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 120_000, timeout: 12_000 }
    );
  }, [onLocated]);
  return null;
}

function MapLocateToolbar({
  userPos,
  setUserPos,
}: {
  userPos: [number, number] | null;
  setUserPos: (p: [number, number] | null) => void;
}) {
  const map = useMap();

  const locate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(next);
        map.setView(next, Math.max(map.getZoom(), 11));
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  }, [map, setUserPos]);

  return (
    <div
      className="leaflet-top leaflet-right leaflet-control"
      style={{ marginTop: 12, marginRight: 12 }}
    >
      <button
        type="button"
        onClick={locate}
        className="rounded-lg border border-zinc-600 bg-zinc-900/95 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg backdrop-blur-sm hover:bg-zinc-800"
      >
        {userPos ? 'Center on me' : 'Use my location'}
      </button>
    </div>
  );
}

export default function TrailMap({ trails, totalInView }: TrailMapProps) {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  const onLocated = useCallback((p: [number, number]) => {
    setUserPos(p);
  }, []);

  const plotted = trails
    .map((t) => ({ trail: t, coords: parseCoords(t) }))
    .filter((item): item is { trail: ExplorerTrail; coords: [number, number] } => item.coords !== null);

  const center: [number, number] = [34.05, -116.8];

  const noCoords = Math.max(0, totalInView - plotted.length);

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden border border-zinc-800">
      <MapContainer
        center={center}
        zoom={7}
        style={{ height: '100%', width: '100%', background: '#18181b' }}
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <ZoomControl position="bottomright" />

        <AutoGeolocate onLocated={onLocated} />
        <MapLocateToolbar userPos={userPos} setUserPos={setUserPos} />

        {userPos ? (
          <CircleMarker
            center={userPos}
            radius={9}
            pathOptions={{
              color: '#fff',
              weight: 2,
              fillColor: '#3b82f6',
              fillOpacity: 1,
            }}
          >
            <Popup className="trail-map-popup" closeButton={false}>
              <div
                style={{
                  background: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Your location
              </div>
            </Popup>
          </CircleMarker>
        ) : null}

        {plotted.map(({ trail, coords }) => {
          const tier = tierForTrail(trail);
          const color = getTierColor(tier);
          return (
            <CircleMarker
              key={trail.id}
              center={coords}
              radius={8}
              pathOptions={{
                color: '#000',
                weight: 1.5,
                fillColor: color,
                fillOpacity: 0.9,
              }}
            >
              <Popup className="trail-map-popup" closeButton={false}>
                <div
                  style={{
                    background: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    minWidth: '180px',
                    fontFamily: 'inherit',
                  }}
                >
                  <p
                    style={{
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '13px',
                      marginBottom: '2px',
                      lineHeight: '1.3',
                    }}
                  >
                    {trail.name}
                  </p>
                  <p style={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '6px' }}>
                    {trail.location}
                  </p>
                  <span
                    style={{
                      display: 'inline-block',
                      background: color + '22',
                      color: color,
                      border: `1px solid ${color}44`,
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    {tier}
                  </span>
                  <br />
                  <a
                    href={`/trails/${trail.id}`}
                    style={{
                      display: 'inline-block',
                      marginTop: '4px',
                      background: '#f97316',
                      color: '#000',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      textDecoration: 'none',
                    }}
                  >
                    View Trail
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          maxWidth: 'min(260px, calc(100% - 24px))',
          background: 'rgba(9,9,11,0.9)',
          border: '1px solid #3f3f46',
          borderRadius: '10px',
          padding: '8px 12px',
          zIndex: 1000,
          pointerEvents: 'none',
        }}
      >
        {[
          { label: 'Easy', color: '#22c55e' },
          { label: 'Moderate', color: '#eab308' },
          { label: 'Hard', color: '#ef4444' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                border: '1.5px solid rgba(0,0,0,0.4)',
              }}
            />
            <span style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>{label}</span>
          </div>
        ))}
        <p style={{ color: '#71717a', fontSize: '10px', marginTop: '6px', fontWeight: 600 }}>
          Map pins: {plotted.length}
          {totalInView !== plotted.length ? ` · ${totalInView} in list` : ''}
        </p>
        {noCoords > 0 ? (
          <p style={{ color: '#52525b', fontSize: '9px', marginTop: '4px', lineHeight: 1.35 }}>
            {noCoords} trail{noCoords !== 1 ? 's' : ''} have no saved coordinates — open the list or Maps/onX from each trail.
          </p>
        ) : null}
      </div>
    </div>
  );
}
