'use client';

import { LayersControl, LayerGroup, TileLayer } from 'react-leaflet';

export const MAP_MAX_ZOOM = 20;
export const ESRI_MAX_NATIVE = 19;
export const MAP_BACKGROUND = '#f4f4f5';

export const ATTR_CARTO_LIGHT =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';
export const ATTR_ESRI =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

export const ESRI_IMAGERY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const ESRI_LABELS_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
export const CARTO_LIGHT_URL =
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

/** Tailwind classes for Leaflet layer control on app-themed maps. */
export const LEAFLET_LAYERS_CONTROL_CLASS =
  '[&_.leaflet-control-layers]:rounded-lg [&_.leaflet-control-layers]:border-border [&_.leaflet-control-layers]:bg-card [&_.leaflet-control-layers]:text-foreground [&_.leaflet-control-layers-toggle]:rounded-md';

export function LeafletBasemapLayers() {
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked name="Satellite">
        <TileLayer
          attribution={ATTR_ESRI}
          url={ESRI_IMAGERY_URL}
          maxZoom={MAP_MAX_ZOOM}
          maxNativeZoom={ESRI_MAX_NATIVE}
        />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer name="Satellite + labels">
        <LayerGroup>
          <TileLayer
            attribution={ATTR_ESRI}
            url={ESRI_IMAGERY_URL}
            maxZoom={MAP_MAX_ZOOM}
            maxNativeZoom={ESRI_MAX_NATIVE}
          />
          <TileLayer
            attribution={ATTR_ESRI}
            url={ESRI_LABELS_URL}
            maxZoom={MAP_MAX_ZOOM}
            maxNativeZoom={ESRI_MAX_NATIVE}
            opacity={0.9}
          />
        </LayerGroup>
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer name="Map (detail)">
        <TileLayer
          attribution={ATTR_CARTO_LIGHT}
          url={CARTO_LIGHT_URL}
          subdomains="abcd"
          maxZoom={MAP_MAX_ZOOM}
          maxNativeZoom={20}
        />
      </LayersControl.BaseLayer>
    </LayersControl>
  );
}
