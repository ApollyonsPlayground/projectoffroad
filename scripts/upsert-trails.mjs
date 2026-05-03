/**
 * Upsert trails from src/data/trails.json into Supabase.
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
const raw = JSON.parse(readFileSync(trailsPath, 'utf8'));

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

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80';

/**
 * @returns {{ label: string, rows: Record<string, unknown>[] }[]}
 */
function buildAttempts() {
  /** @type {Record<string, unknown>[]} */
  const modernFull = [];
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
    const image = t.image ?? null;

    modernFull.push({
      id: t.id,
      name: t.name,
      location: t.location ?? null,
      difficulty: diff,
      distance: t.distance ?? null,
      estimated_time: t.time ?? null,
      terrain: t.terrain ?? null,
      description: t.description ?? null,
      rig_requirements: t.rigRequirements ?? null,
      photo_url: image,
      maps_url: t.mapsUrl ?? null,
      onx_url: t.onxUrl ?? null,
      tags: t.tags ?? [],
      latitude: lat,
      longitude: lng,
      status: t.status ?? 'Open',
      is_verified: Boolean(t.isVerified ?? t.verified ?? false),
    });

    // image_url + time_estimate (no photo_url, onx_url, maps_url)
    modernImageUrl.push({
      id: t.id,
      name: t.name,
      location: t.location ?? null,
      difficulty: diff,
      distance: t.distance ?? null,
      time_estimate: t.time ?? null,
      terrain: t.terrain ?? null,
      description: t.description ?? null,
      rig_requirements: t.rigRequirements ?? null,
      image_url: image,
      latitude: lat,
      longitude: lng,
      status: t.status ?? 'Open',
    });

    // No rig_requirements / distance / terrain / status (schemas that match minimal + extras)
    imageUrlNoRigOptionalCols.push({
      id: t.id,
      name: t.name,
      location: t.location ?? null,
      difficulty: diff,
      description: t.description ?? null,
      image_url: image,
      time_estimate: t.time ?? null,
      latitude: lat,
      longitude: lng,
    });

    minimalLatLngImageUrl.push({
      id: t.id,
      name: t.name,
      location: t.location ?? null,
      difficulty: diff,
      description: t.description ?? null,
      image_url: image,
      latitude: lat,
      longitude: lng,
    });

    minimalTitleLatLng.push({
      id: t.id,
      title: t.name,
      location: t.location ?? null,
      difficulty: diff,
      description: t.description ?? null,
      image_url: image,
      latitude: lat,
      longitude: lng,
    });

    const coordStr =
      lat != null && lng != null ? `${lat}, ${lng}` : t.coordinates ?? null;
    coordinatesStringOnly.push({
      id: t.id,
      name: t.name,
      location: t.location ?? null,
      difficulty: diff,
      description: t.description ?? null,
      image_url: image,
      coordinates: coordStr,
    });

    legacyTitleShape.push({
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
    { label: 'modern (photo_url, onx_url, estimated_time, lat/lng)', rows: modernFull },
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
