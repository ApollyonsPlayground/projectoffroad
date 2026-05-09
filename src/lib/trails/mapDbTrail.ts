/**
 * Maps Supabase `trails` rows to the shape used by Trail Explorer and detail pages.
 * Supports both the current schema (name, photo_url, latitude, longitude) and
 * legacy column names (title, image_url, coordinates) when present.
 */

import { sanitizeTrailHeroImageUrl } from '@/lib/trails/trailImageUrl';

export type DifficultyTier = 'Easy' | 'Moderate' | 'Hard';

export interface ExplorerTrail {
  id: string;
  name: string;
  location: string;
  /** Raw value from DB (Beginner, Intermediate, Advanced, …) */
  difficulty: string;
  difficultyLevel?: string;
  /** UI copy: Easy / Moderate / Hard */
  difficultyLabel: DifficultyTier;
  distance: string;
  time: string;
  terrain: string;
  description: string;
  image?: string;
  mapsUrl?: string;
  onxUrl?: string;
  rigRequirements?: string;
  tags?: string[];
  coordinates?: string;
  status?: string;
  /** Editorial / verified listing (from `is_verified` column) */
  isVerified: boolean;
}

function pickString(row: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== null && v !== undefined && String(v).trim() !== '') {
      return String(v);
    }
  }
  return fallback;
}

function pickBool(row: Record<string, unknown>, keys: string[]): boolean {
  for (const k of keys) {
    const v = row[k];
    if (v === true || v === 'true' || v === 1 || v === '1') return true;
    if (v === false || v === 'false' || v === 0 || v === '0') return false;
  }
  return false;
}

function parseTags(raw: unknown): string[] | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) return raw.map((x) => String(x));
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw) as unknown;
      if (Array.isArray(j)) return j.map((x) => String(x));
    } catch {
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return undefined;
}

/** Shared helper for lat/lng from `latitude`/`longitude`, `coordinates`, etc. */
export function coordsFromRow(row: Record<string, unknown>): { lat: number; lng: number } | null {
  const latRaw = row.latitude ?? row.lat;
  const lngRaw = row.longitude ?? row.lng ?? row.lon;
  if (latRaw != null && lngRaw != null) {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
  }
  const coordStr = row.coordinates;
  if (typeof coordStr === 'string' && coordStr.trim()) {
    const parts = coordStr.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
  }
  return null;
}

/** Maps DB difficulty strings to three UI tiers (Easy / Moderate / Hard). */
export function rawDifficultyToTier(raw: string): DifficultyTier {
  const t = raw.toLowerCase().trim();
  if (t === 'beginner' || t === 'easy') return 'Easy';
  if (t === 'moderate' || t === 'intermediate') return 'Moderate';
  return 'Hard';
}

export type DifficultyFilter = 'All' | DifficultyTier;

/** Filter chips: All | Easy | Moderate | Hard */
export function difficultyTierMatchesFilter(
  trailDifficultyRaw: string,
  selected: DifficultyFilter
): boolean {
  if (selected === 'All') return true;
  return rawDifficultyToTier(trailDifficultyRaw) === selected;
}

/** ONX uses UUID paths or /us/california/{slug} depending on trail record. */
function onxUrlFromOnxSlug(slug: string): string {
  const s = slug.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    return `https://www.onxmaps.com/offroad/trails/${s}`;
  }
  return `https://www.onxmaps.com/offroad/trails/us/california/${encodeURIComponent(s)}`;
}

export function mapDbTrailRow(row: Record<string, unknown>): ExplorerTrail {
  const id = pickString(row, ['id', 'onx_slug'], '');
  const name = pickString(row, ['name', 'title'], 'Trail');
  const location = pickString(row, ['location'], '');
  const description = pickString(row, ['description'], '');
  const rawDiff = pickString(row, ['difficulty', 'difficulty_level'], 'Moderate');
  const difficultyLabel = rawDifficultyToTier(rawDiff);

  const image =
    sanitizeTrailHeroImageUrl(
      pickString(row, ['photo_url', 'image_url', 'image'], '') || undefined
    ) ?? undefined;

  const coords = coordsFromRow(row);
  const coordinates = coords ? `${coords.lat}, ${coords.lng}` : pickString(row, ['coordinates'], '') || undefined;

  let mapsUrl = pickString(row, ['maps_url', 'google_maps_url'], '') || undefined;
  if (!mapsUrl && coords) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  }
  if (!mapsUrl && name) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${location}`)}`;
  }

  const onxSlug = pickString(row, ['onx_slug'], '') || undefined;
  const onxUrlRaw = pickString(row, ['onx_url'], '') || undefined;
  const onxUrl =
    onxUrlRaw ||
    (onxSlug ? onxUrlFromOnxSlug(onxSlug) : undefined);

  const distance = pickString(row, ['distance', 'distance_miles'], '') || '—';
  const time =
    pickString(row, ['time_estimate', 'time', 'estimated_time'], '') || '—';
  const terrain = pickString(row, ['terrain'], '') || 'off-road';
  const rigRequirements = pickString(row, ['rig_requirements', 'rigRequirements'], '') || undefined;
  const tags = parseTags(row.tags) ?? [];
  const status = pickString(row, ['status'], '') || undefined;
  const isVerified = pickBool(row, ['is_verified', 'verified']);

  return {
    id,
    name,
    location,
    difficulty: rawDiff,
    difficultyLevel: rawDiff,
    difficultyLabel,
    distance,
    time,
    terrain,
    description,
    image,
    mapsUrl,
    onxUrl,
    rigRequirements: rigRequirements || undefined,
    tags,
    coordinates,
    status,
    isVerified,
  };
}

export function sortTrailsByName(rows: ExplorerTrail[]): ExplorerTrail[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}
