'use client';

/**
 * Draggable meetup pin + tap map to move pin. Loaded with next/dynamic({ ssr: false }).
 */
import { useCallback, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function MapViewSync({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center[0], center[1], zoom]);
  return null;
}

function MapTap({
  onTap,
}: {
  onTap: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onTap(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export type MeetupMapPickerProps = {
  /** Map view center */
  center: [number, number];
  /** Current pin */
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
  heightPx?: number;
  zoom?: number;
};

export default function MeetupMapPicker({
  center,
  position,
  onPositionChange,
  heightPx = 220,
  zoom = 11,
}: MeetupMapPickerProps) {
  const pinIcon = useMemo(
    () =>
      new L.Icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    []
  );

  const handleDragEnd = useCallback(
    (e: L.LeafletEvent) => {
      const m = e.target as L.Marker;
      const p = m.getLatLng();
      onPositionChange(p.lat, p.lng);
    },
    [onPositionChange]
  );

  const memoCenter = useMemo(() => center, [center[0], center[1]]);
  const memoPos = useMemo(() => position, [position[0], position[1]]);

  return (
    <div
      className="w-full rounded-xl overflow-hidden border border-zinc-700 ring-1 ring-primary/20"
      style={{ height: heightPx }}
    >
      <MapContainer
        center={memoCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%', background: '#18181b' }}
        scrollWheelZoom
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapViewSync center={memoCenter} zoom={zoom} />
        <MapTap onTap={onPositionChange} />
        <Marker position={memoPos} draggable icon={pinIcon} eventHandlers={{ dragend: handleDragEnd }} />
      </MapContainer>
    </div>
  );
}
