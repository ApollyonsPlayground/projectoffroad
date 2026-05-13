import type { ExplorerTrail } from '@/lib/trails/mapDbTrail';
import { buildExplorerTrailSearchHayLower } from '@/lib/trails/mapDbTrail';

/**
 * Explorer-only area facet (no DB column). Keyword rules align loosely with
 * {@link RegionCards} plus common SoCal club regions.
 */
export type TrailExplorerAreaId =
  | 'all'
  | 'big-bear'
  | 'san-diego'
  | 'palm-springs'
  | 'joshua-tree'
  | 'orange-county'
  | 'inland-empire'
  | 'los-angeles'
  | 'high-desert';

export const EXPLORER_AREA_OPTIONS: { id: TrailExplorerAreaId; label: string }[] = [
  { id: 'all', label: 'All areas' },
  { id: 'big-bear', label: 'Big Bear' },
  { id: 'san-diego', label: 'San Diego' },
  { id: 'palm-springs', label: 'Palm Springs' },
  { id: 'joshua-tree', label: 'Joshua Tree' },
  { id: 'orange-county', label: 'Orange County' },
  { id: 'inland-empire', label: 'Inland Empire' },
  { id: 'los-angeles', label: 'Los Angeles' },
  { id: 'high-desert', label: 'High Desert' },
];

function explorerHay(trail: ExplorerTrail): string {
  if (typeof trail.searchHayLower === 'string' && trail.searchHayLower.length > 0) {
    return trail.searchHayLower;
  }
  return buildExplorerTrailSearchHayLower(trail);
}

export function trailMatchesExplorerArea(trail: ExplorerTrail, areaId: TrailExplorerAreaId): boolean {
  if (areaId === 'all') return true;
  const hay = explorerHay(trail);
  switch (areaId) {
    case 'big-bear':
      return hay.includes('big bear');
    case 'san-diego':
      return hay.includes('san diego');
    case 'palm-springs':
      return (
        hay.includes('palm springs') ||
        hay.includes('idyllwild') ||
        hay.includes('coachella') ||
        hay.includes('cathedral city') ||
        hay.includes('desert hot springs')
      );
    case 'joshua-tree':
      return hay.includes('joshua tree') || hay.includes('twentynine palms') || hay.includes('29 palms');
    case 'orange-county':
      return (
        hay.includes('orange county') ||
        hay.includes('orangecounty') ||
        hay.includes('coto de caza') ||
        hay.includes('irvine') ||
        hay.includes('laguna beach') ||
        hay.includes('huntington beach') ||
        hay.includes('anaheim')
      );
    case 'inland-empire':
      return (
        hay.includes('inland empire') ||
        hay.includes('san bernardino') ||
        hay.includes('riverside county') ||
        hay.includes('fontana') ||
        hay.includes('moreno valley') ||
        hay.includes('redlands') ||
        hay.includes('upland') ||
        hay.includes('chino hills')
      );
    case 'los-angeles':
      return (
        hay.includes('los angeles') ||
        hay.includes('la county') ||
        hay.includes('l.a. county') ||
        hay.includes('santa clarita') ||
        hay.includes('malibu') ||
        hay.includes('pasadena') ||
        hay.includes('burbank')
      );
    case 'high-desert':
      return (
        hay.includes('high desert') ||
        hay.includes('barstow') ||
        hay.includes('victorville') ||
        hay.includes('apple valley') ||
        hay.includes('lucerne valley') ||
        hay.includes('mojave') ||
        hay.includes('adelanto')
      );
    default:
      return false;
  }
}
