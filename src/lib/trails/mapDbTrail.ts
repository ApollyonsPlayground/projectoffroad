/**
 * Maps Supabase `trails` rows to the shape used by Trail Explorer and detail pages.
 * Supports both the current schema (name, photo_url, latitude, longitude) and
 * legacy column names (title, image_url, coordinates) when present.
 */

import { sanitizeTrailHeroImageUrl } from '@/lib/trails/trailImageUrl';

export type DifficultyTier = 'Easy' | 'Moderate' | 'Hard';

/** Typical rigs allowed — trucks vs ATV/SXS; both appears under either explorer filter. */
export type TrailVehicleScope = 'atv' | 'truck' | 'both';

export type VehicleFilter = 'All' | 'ATV' | 'Truck';

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
  /** Numeric coords from DB when present (Trail Map pins). */
  mapLat?: number;
  mapLng?: number;
  status?: string;
  /** Editorial / verified listing (from `is_verified` column) */
  isVerified: boolean;
  /** DB column vehicle_scope or inferred from rig/description/tags text */
  vehicleScope: TrailVehicleScope;
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

function latLngPairSanitized(lat: number, lng: number): { lat: number; lng: number } | null {
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/**
 * Pull numeric lat/lng from Google / generic maps URLs (handles encoded commas, @ viewer coords, ll=).
 */
export function lngLatFromMapsUrl(rawUrl: string): { lat: number; lng: number } | null {
  if (!rawUrl?.trim()) return null;
  let decoded = rawUrl.trim();
  try {
    decoded = decodeURIComponent(decoded.replace(/\+/g, ' '));
  } catch {
    /* keep trimmed rawUrl */
  }

  const qMatch = decoded.match(/[?&#](?:q|query)=([^&#]+)/i);
  if (qMatch) {
    const inner = qMatch[1].replace(/\+/g, ' ');
    const coordSeq = inner.match(/(-?\d+\.?\d*)\s*[, ]\s*(-?\d+\.?\d*)/);
    if (coordSeq) {
      const pair = latLngPairSanitized(parseFloat(coordSeq[1]), parseFloat(coordSeq[2]));
      if (pair) return pair;
    }
  }

  const at = decoded.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)(?:\b|,|\])/);
  if (at) {
    const pair = latLngPairSanitized(parseFloat(at[1]), parseFloat(at[2]));
    if (pair) return pair;
  }

  const ll = decoded.match(/[?&#]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/i);
  if (ll) {
    const pair = latLngPairSanitized(parseFloat(ll[1]), parseFloat(ll[2]));
    if (pair) return pair;
  }

  const pt = decoded.match(/[?&#]center=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/i);
  if (pt) {
    const pair = latLngPairSanitized(parseFloat(pt[1]), parseFloat(pt[2]));
    if (pair) return pair;
  }

  return null;
}

/**
 * Parse lat/lng from onX webmap URLs (`/map/query/{lat},{lng},{zoom}/…`, often under `after_login=`).
 * Used only to populate coordinates → {@link mapDbTrailRow} builds the Google Maps link from those coords.
 */
export function lngLatFromOnxMapsUrl(rawUrl: string): { lat: number; lng: number } | null {
  if (!rawUrl?.trim()) return null;
  const trimmed = rawUrl.trim();
  if (!/onxmaps\.com/i.test(trimmed)) return null;

  let decoded = trimmed;
  for (let i = 0; i < 6; i++) {
    try {
      const next = decodeURIComponent(decoded.replace(/\+/g, ' '));
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }

  const candidates = new Set<string>([trimmed, decoded]);

  try {
    const href = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
    const u = new URL(href);
    for (const v of u.searchParams.values()) {
      if (!v || typeof v !== 'string') continue;
      candidates.add(v);
      let dv = v;
      for (let j = 0; j < 5; j++) {
        try {
          const next = decodeURIComponent(dv.replace(/\+/g, ' '));
          if (next === dv) break;
          dv = next;
          candidates.add(dv);
        } catch {
          break;
        }
      }
    }
  } catch {
    /* ignore malformed URLs */
  }

  const queryPathRx =
    /\/(?:offroad\/)?map\/query\/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)(?:,\s*[\d.]+)?(?:\/|$|\?|&|#)/gi;

  for (const chunk of candidates) {
    queryPathRx.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = queryPathRx.exec(chunk)) !== null) {
      const pair = latLngPairSanitized(parseFloat(m[1]), parseFloat(m[2]));
      if (pair) return pair;
    }
  }

  return null;
}

/** Shared helper for lat/lng from `latitude`/`longitude`, `coordinates`, maps URLs, etc. */
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
    const trimmed = coordStr.trim();
    const parts = trimmed.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
    const nums = trimmed.match(/-?\d+(?:\.\d+)?/g);
    if (nums && nums.length >= 2) {
      const lat = parseFloat(nums[0]);
      const lng = parseFloat(nums[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }
  }
  for (const key of ['maps_url', 'google_maps_url', 'map_url'] as const) {
    const u = row[key];
    if (typeof u === 'string' && u.includes('http')) {
      const ll = lngLatFromMapsUrl(u);
      if (ll) return ll;
    }
  }
  for (const key of ['onx_url', 'onxUrl'] as const) {
    const u = row[key];
    if (typeof u === 'string' && u.includes('http')) {
      const ll = lngLatFromOnxMapsUrl(u);
      if (ll) return ll;
    }
  }
  return null;
}

export function normalizeVehicleScopeFromDb(raw: unknown): TrailVehicleScope | null {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (s === 'atv' || s === 'sxs' || s === 'utv' || s === 'quad') return 'atv';
  if (s === 'truck' || s === 'trucks' || s === '4x4') return 'truck';
  if (s === 'both' || s === 'all' || s === 'mixed' || s === 'either') return 'both';
  return null;
}

/** When DB vehicle_scope is null — keyword hints from catalog copy (best-effort). */
export function inferTrailVehicleScopeFromStrings(parts: string[]): TrailVehicleScope {
  const lower = parts.filter(Boolean).join('\n').toLowerCase();

  const atvSignals =
    /\batv\b|\butv\b|\bsxs\b|side[\s-]?by[\s-]?side|\brzr\b|\brzrs\b|\bpolaris\b|\bcan-am\b|\bcan\s?am\b|\btalon\b|\bquad\b|four[\s-]?wheeler|\bwolverine\b|\bwildcat\b|\bmaverick\s*x\b|\b50[\"′']?\s*(inch|in\.?)\b/i;

  const truckSignals =
    /\btruck\b|\bpickup\b|\bf[\s-]?150\b|\bf[\s-]?250\b|\bf[\s-]?350\b|\b3500\b|\btacoma\b|\btundra\b|\b4runner\b|\bsequoia\b|\bbronco\b|\bwrangler\b|\bgladiator\b|\bcolorado\b|\bsilverado\b|\bsierra\b|\bram\s?1500\b|\bfull[\s-]?size\b|\bf[\s-]?550\b/i;

  const hasAtv = atvSignals.test(lower);
  const hasTruck = truckSignals.test(lower);
  if (hasAtv && hasTruck) return 'both';
  if (hasAtv) return 'atv';
  if (hasTruck) return 'truck';
  return 'both';
}

export function trailMatchesVehicleFilter(scope: TrailVehicleScope, selected: VehicleFilter): boolean {
  if (selected === 'All') return true;
  if (selected === 'ATV') return scope === 'atv' || scope === 'both';
  return scope === 'truck' || scope === 'both';
}

export function trailVehicleScopeShortLabel(scope: TrailVehicleScope): string {
  if (scope === 'atv') return 'ATV / SXS';
  if (scope === 'truck') return 'Trucks / 4×4';
  return 'ATV & trucks';
}

/** Borders/bg for pills & badges (Tailwind utility fragment — compose with layout classes). */
export function trailVehicleScopeBadgeClass(scope: TrailVehicleScope): string {
  if (scope === 'atv') return 'bg-sky-500/15 text-sky-300 border-sky-500/35';
  if (scope === 'truck') return 'bg-amber-500/15 text-amber-300 border-amber-500/35';
  return 'bg-violet-500/15 text-violet-300 border-violet-500/35';
}

export function trailVehicleScopeSearchHay(scope: TrailVehicleScope): string {
  if (scope === 'atv') {
    return 'atv utv sxs side-by-side polaris can-am quad four-wheeler';
  }
  if (scope === 'truck') {
    return 'truck pickup 4x4 jeep tacoma bronco full-size';
  }
  return 'atv utv sxs truck pickup 4x4';
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

/**
 * Trail slug / UUID fragments embedded in marketing or webmap URLs (`site_id=`, path segments).
 * Used only to build www.onxmaps.com/offroad/trails/… links — never as the user-facing webmap URL.
 */
function extractOnxMarketingSlugCandidates(raw: string): string[] {
  const found: string[] = [];
  const variants = new Set<string>([raw.trim()]);
  let s = raw.trim();
  for (let i = 0; i < 6; i++) {
    try {
      const next = decodeURIComponent(s.replace(/\+/g, ' '));
      if (next === s) break;
      s = next;
      variants.add(s);
    } catch {
      break;
    }
  }

  const pushUnique = (x: string | undefined) => {
    if (x && !found.includes(x)) found.push(x);
  };

  for (const chunk of variants) {
    const uuidPath = chunk.match(
      /\/offroad\/trails\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|[?#]|$)/i
    );
    if (uuidPath?.[1]) pushUnique(uuidPath[1]);

    const calPath = chunk.match(/\/offroad\/trails\/us\/california\/([^/?&#]+)/i);
    if (calPath?.[1]) pushUnique(calPath[1]);

    const site = chunk.match(/site_id=([^&]+)/i);
    if (site?.[1]) {
      let path = site[1];
      try {
        path = decodeURIComponent(path.replace(/\+/g, ' '));
      } catch {
        /* keep encoded fragment */
      }
      const up = path.match(
        /offroad\/trails\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i
      );
      if (up?.[1]) pushUnique(up[1]);
      const cp = path.match(/offroad\/trails\/us\/california\/([^/?&#]+)/i);
      if (cp?.[1]) pushUnique(cp[1]);
      const tail = path
        .replace(/^\/+|\/+$/g, '')
        .split('/')
        .filter(Boolean);
      const idx = tail.findIndex((x) => x.toLowerCase() === 'trails');
      if (idx >= 0 && tail[idx + 1]) {
        const after = tail.slice(idx + 1);
        pushUnique(after[after.length - 1]);
        if (
          after.length >= 3 &&
          after[0].toLowerCase() === 'us' &&
          after[1].toLowerCase() === 'california' &&
          after[2]
        ) {
          pushUnique(after[2]);
        }
      }
    }
  }

  return found;
}

/** Canonical public trail page URL from any stored onX string (www trail URL, webmap, marketing). */
export function canonicalOnxTrailPageUrlFromStored(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  if (/^https?:\/\/www\.onxmaps\.com\/offroad\/trails\//i.test(t)) {
    return t.split(/[?#]/)[0].replace(/\/$/, '');
  }
  if (/onxmaps\.com/i.test(t)) {
    for (const seg of extractOnxMarketingSlugCandidates(t)) {
      return onxUrlFromOnxSlug(seg);
    }
  }
  return undefined;
}

/** Resolved www trail URL for Explorer / CTAs; webmap URLs are never returned here. */
export function explorerCanonicalOnxUrl(row: Record<string, unknown>): string | undefined {
  const slugCol = pickString(row, ['onx_slug'], '').trim();
  if (slugCol) return onxUrlFromOnxSlug(slugCol);

  const raw = pickString(row, ['onx_url'], '').trim();
  const fromStored = canonicalOnxTrailPageUrlFromStored(raw || undefined);
  if (fromStored) return fromStored;

  const id = pickString(row, ['id'], '').trim();
  if (!id) return undefined;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return onxUrlFromOnxSlug(id);
  }
  if (/^[a-z0-9][a-z0-9-]{0,160}$/i.test(id)) {
    return onxUrlFromOnxSlug(id);
  }
  return undefined;
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

  /** Whenever we have real coordinates (including from onX `/map/query/lat,lng`, DB columns, etc.), Google opens that pin — not a stale text-only Maps link. */
  let mapsUrl: string | undefined;
  if (coords) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  } else {
    mapsUrl = pickString(row, ['maps_url', 'google_maps_url'], '') || undefined;
    if (!mapsUrl && name) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${location}`)}`;
    }
  }

  const onxUrl = explorerCanonicalOnxUrl(row);

  const distance = pickString(row, ['distance', 'distance_miles'], '') || '—';
  const time =
    pickString(row, ['time_estimate', 'time', 'estimated_time'], '') || '—';
  const terrain = pickString(row, ['terrain'], '') || 'off-road';
  const rigRequirements = pickString(row, ['rig_requirements', 'rigRequirements'], '') || undefined;
  const tags = parseTags(row.tags) ?? [];
  const status = pickString(row, ['status'], '') || undefined;
  const isVerified = pickBool(row, ['is_verified', 'verified']);

  const fromDb =
    normalizeVehicleScopeFromDb(row.vehicle_scope) ??
    normalizeVehicleScopeFromDb((row as { vehicleScope?: unknown }).vehicleScope);
  const vehicleScope: TrailVehicleScope =
    fromDb ??
    inferTrailVehicleScopeFromStrings([
      rigRequirements ?? '',
      terrain ?? '',
      description ?? '',
      name ?? '',
      location ?? '',
      ...(tags ?? []),
    ]);

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
    ...(coords ? { mapLat: coords.lat, mapLng: coords.lng } : {}),
    status,
    isVerified,
    vehicleScope,
  };
}

/** Lat/lng for map pins — matches DB mapping plus URL fallbacks on the explorer shape. */
export function explorerTrailLngLat(trail: ExplorerTrail): [number, number] | null {
  if (trail.mapLat != null && trail.mapLng != null) {
    const lat = Number(trail.mapLat);
    const lng = Number(trail.mapLng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return [lat, lng];
  }
  if (trail.coordinates?.trim()) {
    const trimmed = trail.coordinates.trim();
    const parts = trimmed.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      return [parts[0], parts[1]];
    }
    const nums = trimmed.match(/-?\d+(?:\.\d+)?/g);
    if (nums && nums.length >= 2) {
      const lat = parseFloat(nums[0]);
      const lng = parseFloat(nums[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return [lat, lng];
    }
  }
  if (trail.mapsUrl) {
    const ll = lngLatFromMapsUrl(trail.mapsUrl);
    if (ll) return [ll.lat, ll.lng];
  }
  if (trail.onxUrl) {
    const ll = lngLatFromOnxMapsUrl(trail.onxUrl);
    if (ll) return [ll.lat, ll.lng];
  }
  return null;
}

/** Multi-token search: every word must appear somewhere in name, location, tags, etc. */
export function explorerTrailMatchesSearch(trail: ExplorerTrail, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const tokens = q.split(/\s+/).filter((t) => t.length > 0);
  const hay = [
    trail.name,
    trail.location,
    trail.description ?? '',
    trail.terrain ?? '',
    trail.difficulty ?? '',
    trail.difficultyLevel ?? '',
    trail.distance ?? '',
    trail.time ?? '',
    trail.rigRequirements ?? '',
    trailVehicleScopeSearchHay(trail.vehicleScope),
    ...(trail.tags ?? []),
  ]
    .join('\n')
    .toLowerCase();
  return tokens.every((tok) => hay.includes(tok));
}

export function sortTrailsByName(rows: ExplorerTrail[]): ExplorerTrail[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/** Older offline caches may omit vehicle_scope — infer without touching newer rows. */
export function ensureExplorerTrailVehicleScope(trail: ExplorerTrail): ExplorerTrail {
  const vs = trail.vehicleScope;
  if (vs === 'atv' || vs === 'truck' || vs === 'both') return trail;
  return {
    ...trail,
    vehicleScope: inferTrailVehicleScopeFromStrings([
      trail.rigRequirements ?? '',
      trail.terrain ?? '',
      trail.description ?? '',
      trail.name ?? '',
      trail.location ?? '',
      ...(trail.tags ?? []),
    ]),
  };
}
