/**
 * Upsert trails from src/data/trails.json (+ optional trails-ca-onx-stubs.json) into Supabase.
 * Tries several row shapes so it works with different existing `trails` schemas.
 *
 * Run: npm run seed:trails
 * Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (required — anon cannot INSERT past RLS)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    '[upsert-trails] Missing credentials.\n' +
      '  Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local\n' +
      '  (Dashboard → Project Settings → API → service_role secret).\n' +
      '  The anon key cannot seed trails when RLS blocks INSERT — use the service role for this script only.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const trailsPath = join(__dirname, '../src/data/trails.json');
const caStubsPath = join(__dirname, '../src/data/trails-ca-onx-stubs.json');

/** @type {unknown[]} */
let raw = JSON.parse(readFileSync(trailsPath, 'utf8'));
try {
  const extra = JSON.parse(readFileSync(caStubsPath, 'utf8'));
  if (Array.isArray(extra) && extra.length > 0) {
    raw = [...raw, ...extra];
    console.log(`[upsert-trails] Including ${extra.length} rows from trails-ca-onx-stubs.json`);
  }
} catch (e) {
  const code = /** @type {{ code?: string }} */ (e)?.code;
  if (code !== 'ENOENT') throw e;
}

/** Strip onX-hosted image URLs — never hotlink their CDN. Mirrors `src/lib/trails/trailImageUrl.ts`. */
function sanitizeTrailHeroImageUrl(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  let hostname = '';
  try {
    hostname = new URL(s).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (hostname === 'onxmaps.com' || hostname.endsWith('.onxmaps.com')) return null;
  return s;
}

function parseCoords(trail) {
  if (trail.coordinates) {
    const parts = trail.coordinates.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
  }
  if (trail.mapsUrl) {
    const match = trail.mapsUrl.match(/query=([-\d.]+),([-\d.]+)/);
    if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  return { lat: null, lng: null };
}

/** Always seed a Maps link: explicit JSON, coords, or name+location search. */
function googleMapsUrlForTrail(trail, lat, lng) {
  const explicit = typeof trail.mapsUrl === 'string' ? trail.mapsUrl.trim() : '';
  if (explicit) return explicit;
  if (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const name = String(trail.name ?? '').trim();
  const loc = String(trail.location ?? 'California').trim();
  const q = encodeURIComponent(
    `${name} ${loc}`.trim() || 'California off-road trail'
  );
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Maps JSON difficulties into legacy CHECK constraint values when needed */
function normalizeLegacyDifficulty(d) {
  const x = String(d ?? 'Moderate').trim();
  const l = x.toLowerCase();
  if (l === 'intermediate') return 'Moderate';
  if (['Beginner', 'Moderate', 'Advanced', 'Extreme'].includes(x)) return x;
  if (l === 'beginner' || l === 'easy') return 'Beginner';
  if (l === 'moderate') return 'Moderate';
  if (l === 'advanced' || l === 'challenging') return 'Advanced';
  if (l === 'extreme' || l === 'expert') return 'Extreme';
  return 'Moderate';
}

/** Optional seed field vehicle_scope for explorer filters (matches CHECK constraint). */
function normalizeVehicleScopeSeed(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (['atv', 'sxs', 'utv', 'quad'].includes(s)) return 'atv';
  if (['truck', 'trucks', '4x4'].includes(s)) return 'truck';
  if (['both', 'all', 'mixed', 'either'].includes(s)) return 'both';
  return null;
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80';

/**
 * @returns {{ label: string, rows: Record<string, unknown>[] }[]}
 */
function buildAttempts() {
  /** Rich rows: `image_url` (never `photo_url`), plus onX + Maps + time — matches typical Supabase trails tables. */
  /** @type {Record<string, unknown>[]} */
  const richImageUrlTe = [];
  /** @type {Record<string, unknown>[]} */
  const richImageUrlEt = [];
  /** Same keys without optional extras that older tables might lack. */
  /** @type {Record<string, unknown>[]} */
  const slimImageUrlTe = [];
  /** @type {Record<string, unknown>[]} */
  const slimImageUrlEt = [];
  /** Links only when time columns are absent or problematic. */
  /** @type {Record<string, unknown>[]} */
  const linksOnlyImageUrl = [];
  /** Maps link only (no onX column). */
  /** @type {Record<string, unknown>[]} */
  const mapsOnlyImageUrl = [];
  /** @type {Record<string, unknown>[]} */
  const modernImageUrl = [];
  /** @type {Record<string, unknown>[]} */
  const imageUrlNoRigOptionalCols = [];
  /** @type {Record<string, unknown>[]} */
  const minimalLatLngImageUrl = [];
  /** @type {Record<string, unknown>[]} */
  const minimalTitleLatLng = [];
  /** @type {Record<string, unknown>[]} */
  const coordinatesStringOnly = [];
  /** @type {Record<string, unknown>[]} */
  const legacyTitleShape = [];

  for (const t of raw) {
    const { lat, lng } = parseCoords(t);
    const diff = (t.difficulty ?? t.difficultyLevel ?? 'Moderate').trim();
    const image = sanitizeTrailHeroImageUrl(t.image ?? null);
    const mapsUrl = googleMapsUrlForTrail(t, lat, lng);
    const timeStr = t.time != null && String(t.time).trim() !== '' ? String(t.time).trim() : '—';
    const vehicleScope = normalizeVehicleScopeSeed(t.vehicleScope ?? t.vehicle_scope);
    const optionalVehicleScope = vehicleScope ? { vehicle_scope: vehicleScope } : {};

    const coreMinimal = {
      id: t.id,
      name: t.name,
      location: t.location ?? null,
      difficulty: diff,
      description: t.description ?? null,
      image_url: image || null,
      latitude: lat,
      longitude: lng,
    };

    richImageUrlTe.push({
      ...coreMinimal,
      ...optionalVehicleScope,
      onx_url: t.onxUrl ?? null,
      maps_url: mapsUrl,
      time_estimate: timeStr,
      distance: t.distance ?? null,
      terrain: t.terrain ?? null,
      rig_requirements: t.rigRequirements ?? null,
      status: t.status ?? 'Open',
      is_verified: Boolean(t.isVerified ?? t.verified ?? false),
    });

    richImageUrlEt.push({
      ...coreMinimal,
      ...optionalVehicleScope,
      onx_url: t.onxUrl ?? null,
      maps_url: mapsUrl,
      estimated_time: timeStr,
      distance: t.distance ?? null,
      terrain: t.terrain ?? null,
      rig_requirements: t.rigRequirements ?? null,
      status: t.status ?? 'Open',
      is_verified: Boolean(t.isVerified ?? t.verified ?? false),
    });

    slimImageUrlTe.push({
      ...coreMinimal,
      ...optionalVehicleScope,
      onx_url: t.onxUrl ?? null,
      maps_url: mapsUrl,
      time_estimate: timeStr,
    });

    slimImageUrlEt.push({
      ...coreMinimal,
      ...optionalVehicleScope,
      onx_url: t.onxUrl ?? null,
      maps_url: mapsUrl,
      estimated_time: timeStr,
    });

    linksOnlyImageUrl.push({
      ...coreMinimal,
      ...optionalVehicleScope,
      onx_url: t.onxUrl ?? null,
      maps_url: mapsUrl,
    });

    mapsOnlyImageUrl.push({
      ...coreMinimal,
      ...optionalVehicleScope,
      maps_url: mapsUrl,
    });

    modernImageUrl.push({
      ...optionalVehicleScope,
      id: t.id,
      name: t.name,
      location: t.location ?? null,
      difficulty: diff,
      distance: t.distance ?? null,
      time_estimate: timeStr,
      terrain: t.terrain ?? null,
      description: t.description ?? null,
      rig_requirements: t.rigRequirements ?? null,
      image_url: image || null,
      latitude: lat,
      longitude: lng,
      status: t.status ?? 'Open',
    });

    imageUrlNoRigOptionalCols.push({
      ...optionalVehicleScope,
      id: t.id,
      name: t.name,
      location: t.location ?? null,
      difficulty: diff,
      description: t.description ?? null,
      image_url: image || null,
      time_estimate: timeStr,
      latitude: lat,
      longitude: lng,
    });

    minimalLatLngImageUrl.push({ ...coreMinimal, ...optionalVehicleScope });

    minimalTitleLatLng.push({
      ...optionalVehicleScope,
      id: t.id,
      title: t.name,
      location: t.location ?? null,
      difficulty: diff,
      description: t.description ?? null,
      image_url: image || null,
      latitude: lat,
      longitude: lng,
    });

    const coordStr =
      lat != null && lng != null ? `${lat}, ${lng}` : t.coordinates ?? null;
    coordinatesStringOnly.push({
      ...optionalVehicleScope,
      id: t.id,
      name: t.name,
      location: t.location ?? null,
      difficulty: diff,
      description: t.description ?? null,
      image_url: image || null,
      coordinates: coordStr,
    });

    legacyTitleShape.push({
      ...optionalVehicleScope,
      id: t.id,
      title: t.name,
      location: t.location ?? '',
      difficulty: normalizeLegacyDifficulty(diff),
      difficulty_level: diff,
      rig_requirements: t.rigRequirements || 'Varies by vehicle and conditions',
      onx_slug: String(t.id).replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'trail',
      coordinates: coordStr || '34.0, -117.0',
      status: (t.status === 'Closed' ? 'Closed' : t.status === 'Seasonal' ? 'Seasonal' : 'Open'),
      image_url: image || FALLBACK_IMAGE,
      distance: t.distance || '—',
      time_estimate: t.time || '—',
      description: t.description || '',
      terrain: t.terrain || 'off-road',
    });
  }

  return [
    // Prefer `estimated_time` first — matches typical seeded Supabase trails schemas (`time_estimate` attempt stays next for DBs that use that name only).
    {
      label: 'image_url + onx_url + maps_url + estimated_time (+distance/terrain/status)',
      rows: richImageUrlEt,
    },
    {
      label: 'image_url + onx_url + maps_url + time_estimate (+distance/terrain/status)',
      rows: richImageUrlTe,
    },
    { label: 'image_url + onx_url + maps_url + estimated_time', rows: slimImageUrlEt },
    { label: 'image_url + onx_url + maps_url + time_estimate', rows: slimImageUrlTe },
    { label: 'image_url + onx_url + maps_url', rows: linksOnlyImageUrl },
    { label: 'image_url + maps_url', rows: mapsOnlyImageUrl },
    { label: 'minimal (name + image_url + latitude + longitude)', rows: minimalLatLngImageUrl },
    { label: 'image_url + time_estimate + lat/lng (no rig_requirements)', rows: imageUrlNoRigOptionalCols },
    { label: 'image_url + rig_requirements + distance + …', rows: modernImageUrl },
    { label: 'minimal (title + image_url + lat/lng)', rows: minimalTitleLatLng },
    { label: 'coordinates string + image_url (no lat/lng columns)', rows: coordinatesStringOnly },
    { label: 'legacy (title, onx_slug, time_estimate, coordinates text)', rows: legacyTitleShape },
  ];
}

const attempts = buildAttempts();

console.log(`[upsert-trails] Upserting ${raw.length} trails…`);

let lastError = null;
for (const { label, rows } of attempts) {
  const { error } = await supabase.from('trails').upsert(rows, {
    onConflict: 'id',
    ignoreDuplicates: false,
  });
  if (!error) {
    console.log(`[upsert-trails] Success using: ${label}`);
    console.log(`[upsert-trails] Done. ${rows.length} trails upserted.`);
    process.exit(0);
  }
  lastError = error;
  console.warn(`[upsert-trails] Attempt failed (${label}):`, error.message);
}

console.error('[upsert-trails] All attempts failed. Last error:', lastError?.message);
console.error(
  '[upsert-trails] Align your table with supabase/migrations or add missing columns (e.g. name, image_url, latitude, longitude).'
);
process.exit(1);
