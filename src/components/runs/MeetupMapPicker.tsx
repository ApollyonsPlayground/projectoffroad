'use client';

/**
 * Draggable meetup pin + tap map to move pin. Loaded with next/dynamic({ ssr: false }).
 * Basemaps: dark street (CARTO), Esri satellite, Esri satellite with place labels.
 */
import { useCallback, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
  LayersControl,
  LayerGroup,
  ScaleControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MAP_MAX_ZOOM = 20;
const ESRI_MAX_NATIVE = 19;

const ATTR_CARTO_DARK =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';
const ATTR_ESRI =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

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

  const esriImageryUrl =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const esriLabelsUrl =
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

  return (
    <div
      className="w-full rounded-xl overflow-hidden border border-border ring-1 ring-primary/20 [&_.leaflet-control-layers]:rounded-lg [&_.leaflet-control-layers]:border-border [&_.leaflet-control-layers]:bg-card [&_.leaflet-control-layers]:text-foreground [&_.leaflet-control-layers-toggle]:rounded-md"
      style={{ height: heightPx }}
    >
      <MapContainer
        center={memoCenter}
        zoom={zoom}
        maxZoom={MAP_MAX_ZOOM}
        style={{ height: '100%', width: '100%', background: '#18181b' }}
        scrollWheelZoom
        zoomControl
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Map (dark)">
            <TileLayer
              attribution={ATTR_CARTO_DARK}
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={MAP_MAX_ZOOM}
              maxNativeZoom={20}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution={ATTR_ESRI}
              url={esriImageryUrl}
              maxZoom={MAP_MAX_ZOOM}
              maxNativeZoom={ESRI_MAX_NATIVE}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite + labels">
            <LayerGroup>
              <TileLayer
                attribution={ATTR_ESRI}
                url={esriImageryUrl}
                maxZoom={MAP_MAX_ZOOM}
                maxNativeZoom={ESRI_MAX_NATIVE}
              />
              <TileLayer
                attribution={ATTR_ESRI}
                url={esriLabelsUrl}
                maxZoom={MAP_MAX_ZOOM}
                maxNativeZoom={ESRI_MAX_NATIVE}
                opacity={0.9}
              />
            </LayerGroup>
          </LayersControl.BaseLayer>
        </LayersControl>
        <ScaleControl position="bottomleft" imperial metric />
        <MapViewSync center={memoCenter} zoom={zoom} />
        <MapTap onTap={onPositionChange} />
        <Marker position={memoPos} draggable icon={pinIcon} eventHandlers={{ dragend: handleDragEnd }} />
      </MapContainer>
    </div>
  );
}
