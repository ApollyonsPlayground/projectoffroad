import type { ExplorerTrail } from '@/lib/trails/mapDbTrail';
import { canonicalOnxTrailPageUrlFromStored, lngLatFromOnxMapsUrl } from '@/lib/trails/mapDbTrail';
import trailsCatalog from '@/data/trails.json';

type CatalogRow = {
  id: string;
  onxUrl?: string;
  mapsUrl?: string;
};

const catalogById = new Map<string, CatalogRow>(
  (trailsCatalog as CatalogRow[]).map((row) => [row.id, row])
);

/** Fill missing onX / Maps URLs from bundled catalog (matches seeded JSON). */
export function applyCatalogTrailLinks(trail: ExplorerTrail): ExplorerTrail {
  const cat = catalogById.get(trail.id);
  if (!cat) return trail;

  const catOnx = cat.onxUrl?.trim();
  const catMaps = cat.mapsUrl?.trim();

  let next: ExplorerTrail = { ...trail };

  const canonFromCat = canonicalOnxTrailPageUrlFromStored(catOnx);
  if (!next.onxUrl?.trim() && canonFromCat) {
    next = { ...next, onxUrl: canonFromCat };
  }

  if (!next.mapsUrl?.trim() && catMaps) {
    next = { ...next, mapsUrl: catMaps };
  }

  const missingPin = next.mapLat == null || next.mapLng == null;
  if (missingPin && catOnx && /webmap\.onxmaps\.com|\/map\/query\/|after_login=/i.test(catOnx)) {
    const ll = lngLatFromOnxMapsUrl(catOnx);
    if (ll) {
      next = {
        ...next,
        mapLat: ll.lat,
        mapLng: ll.lng,
        coordinates: `${ll.lat}, ${ll.lng}`,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${ll.lat},${ll.lng}`,
      };
    }
  }

  return next;
}
