'use client';

/**
 * TrailMap — Discovery Map powered by react-leaflet.
 * Renders colored circle markers for every trail that has coordinates.
 * Colors match the difficulty badges used on the trail cards.
 *
 * This component must be loaded via next/dynamic with { ssr: false }
 * because Leaflet accesses `window` on import.
 */

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { DifficultyTier } from '@/lib/trails/mapDbTrail';
import { rawDifficultyToTier } from '@/lib/trails/mapDbTrail';

interface TrailForMap {
  id: string;
  name: string;
  location: string;
  difficulty: string;
  difficultyLevel?: string;
  difficultyLabel?: DifficultyTier;
  coordinates?: string;
  mapsUrl?: string;
}

interface TrailMapProps {
  trails: TrailForMap[];
}

/** Parse "34.3031, -117.4524" into [lat, lng]. Returns null if invalid. */
function parseCoords(trail: TrailForMap): [number, number] | null {
  if (trail.coordinates) {
    const parts = trail.coordinates.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[0], parts[1]];
    }
  }
  if (trail.mapsUrl) {
    const match = trail.mapsUrl.match(/query=([-\d.]+),([-\d.]+)/);
    if (match) return [parseFloat(match[1]), parseFloat(match[2])];
  }
  return null;
}

function tierForTrail(trail: TrailForMap): DifficultyTier {
  return trail.difficultyLabel ?? rawDifficultyToTier(trail.difficulty || trail.difficultyLevel || '');
}

/** Marker colors: Easy / Moderate / Hard */
function getTierColor(tier: DifficultyTier): string {
  if (tier === 'Easy') return '#22c55e';
  if (tier === 'Moderate') return '#eab308';
  return '#ef4444';
}

export default function TrailMap({ trails }: TrailMapProps) {
  // Trails that have parseable coordinates
  const plotted = trails
    .map((t) => ({ trail: t, coords: parseCoords(t) }))
    .filter((item): item is { trail: TrailForMap; coords: [number, number] } => item.coords !== null);

  // Center on Southern California (roughly center of all trails)
  const center: [number, number] = [34.05, -116.8];

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-zinc-800">
      <MapContainer
        center={center}
        zoom={7}
        style={{ height: '100%', width: '100%', background: '#18181b' }}
        scrollWheelZoom
        zoomControl
      >
        {/* Dark-toned tile layer using CartoDB Dark Matter */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

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
              <Popup
                className="trail-map-popup"
                closeButton={false}
              >
                <div style={{
                  background: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  minWidth: '180px',
                  fontFamily: 'inherit',
                }}>
                  <p style={{
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '13px',
                    marginBottom: '2px',
                    lineHeight: '1.3',
                  }}>
                    {trail.name}
                  </p>
                  <p style={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '6px' }}>
                    {trail.location}
                  </p>
                  <span style={{
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
                  }}>
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

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '80px',
          right: '12px',
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
            <span style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: color, flexShrink: 0, border: '1.5px solid rgba(0,0,0,0.4)',
            }} />
            <span style={{ color: '#a1a1aa', fontSize: '11px', fontWeight: 600 }}>{label}</span>
          </div>
        ))}
        <p style={{ color: '#71717a', fontSize: '10px', marginTop: '6px', fontWeight: 600 }}>
          {plotted.length} trail{plotted.length !== 1 ? 's' : ''} match{plotted.length === 1 ? 'es' : ''} your filter
        </p>
      </div>
    </div>
  );
}
