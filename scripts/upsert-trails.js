/**
 * One-time script: upsert all 79 trails from src/data/trails.json into
 * the Supabase trails table, populating latitude and longitude from the
 * "coordinates" field ("lat, lng") in each trail record.
 *
 * Run with:
 *   node --env-file-if-exists=/vercel/share/.env.project scripts/upsert-trails.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[upsert-trails] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const trailsPath = join(__dirname, '../src/data/trails.json');
const raw = JSON.parse(readFileSync(trailsPath, 'utf8'));

/**
 * Parse "34.3031, -117.4524" → { lat: 34.3031, lng: -117.4524 }
 * Falls back to extracting from mapsUrl if coordinates field is missing.
 */
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

const records = raw.map((t) => {
  const { lat, lng } = parseCoords(t);
  return {
    id: t.id,
    name: t.name,
    location: t.location ?? null,
    difficulty: (t.difficulty ?? t.difficultyLevel ?? 'Moderate').trim(),
    distance: t.distance ?? null,
    estimated_time: t.time ?? null,
    terrain: t.terrain ?? null,
    description: t.description ?? null,
    rig_requirements: t.rigRequirements ?? null,
    photo_url: t.image ?? null,
    maps_url: t.mapsUrl ?? null,
    onx_url: t.onxUrl ?? null,
    tags: t.tags ?? [],
    latitude: lat,
    longitude: lng,
    status: t.status ?? 'Open',
  };
});

console.log(`[upsert-trails] Upserting ${records.length} trails…`);

const { error } = await supabase
  .from('trails')
  .upsert(records, { onConflict: 'id', ignoreDuplicates: false });

if (error) {
  console.error('[upsert-trails] Upsert failed:', error.message);
  // Retry with only the guaranteed columns in case schema differs
  console.log('[upsert-trails] Retrying with minimal columns…');
  const minimal = records.map((r) => ({
    id: r.id,
    name: r.name,
    location: r.location,
    difficulty: r.difficulty,
    description: r.description,
    photo_url: r.photo_url,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
  const { error: e2 } = await supabase
    .from('trails')
    .upsert(minimal, { onConflict: 'id', ignoreDuplicates: false });
  if (e2) {
    console.error('[upsert-trails] Minimal retry also failed:', e2.message);
    process.exit(1);
  }
}

console.log(`[upsert-trails] Done. ${records.length} trails upserted successfully.`);
