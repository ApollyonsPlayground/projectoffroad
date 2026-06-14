'use client';

/**
 * Draggable meetup pin + tap map to move pin. Loaded with next/dynamic({ ssr: false }).
 * Basemaps: satellite (default), satellite + labels, light street detail.
 */
import { useCallback, useEffect, useMemo } from 'react';
import {
  MapContainer,
  Marker,
  useMap,
  useMapEvents,
  ScaleControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  LEAFLET_LAYERS_CONTROL_CLASS,
  LeafletBasemapLayers,
  MAP_BACKGROUND,
  MAP_MAX_ZOOM,
} from '@/lib/maps/leafletBasemaps';

function MapViewSync({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  const [cenLat, cenLng] = center;
  useEffect(() => {
    map.setView([cenLat, cenLng], zoom, { animate: true });
  }, [map, cenLat, cenLng, zoom]);
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

  const [cenLat, cenLng] = center;
  const [pinLat, pinLng] = position;
  const memoCenter = useMemo<[number, number]>(() => [cenLat, cenLng], [cenLat, cenLng]);
  const memoPos = useMemo<[number, number]>(() => [pinLat, pinLng], [pinLat, pinLng]);

  return (
    <div
      className={`w-full rounded-xl overflow-hidden border border-border ring-1 ring-primary/20 ${LEAFLET_LAYERS_CONTROL_CLASS}`}
      style={{ height: heightPx }}
    >
      <MapContainer
        center={memoCenter}
        zoom={zoom}
        maxZoom={MAP_MAX_ZOOM}
        style={{ height: '100%', width: '100%', background: MAP_BACKGROUND }}
        scrollWheelZoom
        zoomControl
      >
        <LeafletBasemapLayers />
        <ScaleControl position="bottomleft" imperial metric />
        <MapViewSync center={memoCenter} zoom={zoom} />
        <MapTap onTap={onPositionChange} />
        <Marker position={memoPos} draggable icon={pinIcon} eventHandlers={{ dragend: handleDragEnd }} />
      </MapContainer>
    </div>
  );
}
