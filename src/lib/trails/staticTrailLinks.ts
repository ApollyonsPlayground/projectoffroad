import type { ExplorerTrail } from '@/lib/trails/mapDbTrail';
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

  return {
    ...trail,
    onxUrl: trail.onxUrl || (catOnx ? catOnx : undefined),
    mapsUrl:
      trail.mapsUrl ||
      (catMaps
        ? catMaps
        : undefined),
  };
}
