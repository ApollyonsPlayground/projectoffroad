/**
 * Pull trailhead-style coordinates from public onX **www** trail HTML (no redirect chasing).
 * The webmap deep link is embedded in page source, e.g.:
 *   webmap.onxmaps.com/offroad/map/query/33.289546,-116.1997077,12.83
 *
 * Shell equivalent (first hit only — zoom is third comma-group, ignored here):
 *   curl -s "https://www.onxmaps.com/offroad/trails/us/california/thimble-trail" \
 *     | grep -oP 'webmap.onxmaps.com/offroad/map/query/\K[0-9.,-]+' | head -1
 *
 * Usage:
 *   node scripts/fetch-onx-trail-coords.mjs --dry-run [--limit 20]
 *   node scripts/fetch-onx-trail-coords.mjs --supabase --dry-run
 *   node scripts/fetch-onx-trail-coords.mjs --supabase --patch   # needs SUPABASE_SERVICE_ROLE_KEY
 *   node scripts/fetch-onx-trail-coords.mjs --url "https://www.onxmaps.com/offroad/trails/us/california/thimble-trail"
 *
 * Options:
 *   --missing-only     Skip rows that already have latitude & longitude
 *   --delay-ms 650     Pause between HTTP requests (default 650)
 *   --json-output PATH Write newline-delimited JSON results
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** @typedef {{ id?: string; name?: string; lat: number; lng: number; url: string; ok: boolean; error?: string }} CoordResult */

/**
 * @param {string} html
 * @returns {{ lat: number; lng: number } | null}
 */
export function extractCoordsFromOnxTrailHtml(html) {
  if (!html || typeof html !== 'string') return null;

  /** @type {{ lat: number; lng: number }[]} */
  const found = [];

  const patterns = [
    /webmap\.onxmaps\.com\/offroad\/map\/query\/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)(?:,\s*[\d.]+)?/gi,
    /webmap\.onxmaps\.com\\\/offroad\\\/map\\\/query\\\/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)(?:,\s*[\d.]+)?/gi,
  ];

  for (const rx of patterns) {
    rx.lastIndex = 0;
    let m;
    while ((m = rx.exec(html)) !== null) {
      found.push({ lat: parseFloat(m[1]), lng: parseFloat(m[2]) });
    }
  }

  for (const c of found) {
    if (
      Number.isFinite(c.lat) &&
      Number.isFinite(c.lng) &&
      Math.abs(c.lat) <= 90 &&
      Math.abs(c.lng) <= 180
    ) {
      return { lat: c.lat, lng: c.lng };
    }
  }
  return null;
}

/**
 * @param {Record<string, unknown>} trail
 * @returns {string | null}
 */
function canonicalWwwOnxTrailUrlFromJson(trail) {
  const raw = typeof trail.onxUrl === 'string' ? trail.onxUrl.trim() : '';
  if (/^https?:\/\/www\.onxmaps\.com\/offroad\/trails\//i.test(raw)) {
    return raw.replace(/[?#].*$/, '').replace(/\/$/, '');
  }
  const id = String(trail.id ?? '').trim();
  if (!id) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return `https://www.onxmaps.com/offroad/trails/${id}`;
  }
  return `https://www.onxmaps.com/offroad/trails/us/california/${encodeURIComponent(id)}`;
}

/**
 * @param {{ id?: unknown; onx_url?: unknown }} row
 * @returns {string | null}
 */
function canonicalWwwOnxTrailUrlFromDb(row) {
  const raw = typeof row.onx_url === 'string' ? row.onx_url.trim() : '';
  if (/^https?:\/\/www\.onxmaps\.com\/offroad\/trails\//i.test(raw)) {
    return raw.replace(/[?#].*$/, '').replace(/\/$/, '');
  }
  const id = String(row.id ?? '').trim();
  if (!id) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return `https://www.onxmaps.com/offroad/trails/${id}`;
  }
  return `https://www.onxmaps.com/offroad/trails/us/california/${encodeURIComponent(id)}`;
}

/**
 * @param {Record<string, unknown>} trail
 */
function jsonRowHasCoords(trail) {
  const lat = trail.latitude ?? trail.lat;
  const lng = trail.longitude ?? trail.lng;
  if (lat != null && lng != null) {
    const a = Number(lat);
    const b = Number(lng);
    if (Number.isFinite(a) && Number.isFinite(b)) return true;
  }
  const cs = trail.coordinates;
  if (typeof cs === 'string' && cs.trim()) {
    const parts = cs.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) return true;
  }
  return false;
}

/**
 * @param {{ latitude?: unknown; longitude?: unknown }} row
 */
function dbRowHasCoords(row) {
  const lat = row.latitude;
  const lng = row.longitude;
  if (lat == null || lng == null) return false;
  const a = Number(lat);
  const b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b);
}

async function fetchTrailHtml(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
  /** @type {{ source: 'json' | 'supabase'; patch: boolean; missingOnly: boolean; limit: number | null; delayMs: number; jsonOutput: string | null; singleUrl: string | null; dryRun: boolean }} */
  const o = {
    source: 'json',
    patch: false,
    missingOnly: false,
    limit: null,
    delayMs: 650,
    jsonOutput: null,
    singleUrl: null,
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--supabase') o.source = 'supabase';
    else if (a === '--patch') o.patch = true;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--missing-only') o.missingOnly = true;
    else if (a === '--limit') o.limit = Math.max(0, Number(argv[++i]) || 0);
    else if (a === '--delay-ms') o.delayMs = Math.max(0, Number(argv[++i]) || 650);
    else if (a === '--json-output') o.jsonOutput = argv[++i] ?? null;
    else if (a === '--url') o.singleUrl = argv[++i] ?? null;
    else if (a === '--help' || a === '-h') {
      console.log(`See file header in scripts/fetch-onx-trail-coords.mjs`);
      process.exit(0);
    }
  }
  if (!o.patch && !o.dryRun && !o.singleUrl) o.dryRun = true;
  if (o.patch) o.dryRun = false;
  return o;
}

async function loadJsonTrails() {
  const trailsPath = join(__dirname, '../src/data/trails.json');
  const caStubsPath = join(__dirname, '../src/data/trails-ca-onx-stubs.json');
  /** @type {unknown[]} */
  let rows = JSON.parse(readFileSync(trailsPath, 'utf8'));
  try {
    const extra = JSON.parse(readFileSync(caStubsPath, 'utf8'));
    if (Array.isArray(extra) && extra.length > 0) {
      rows = [...rows, ...extra];
      console.log(`[onx-coords] Loaded ${extra.length} stub rows from trails-ca-onx-stubs.json`);
    }
  } catch (e) {
    const code = /** @type {{ code?: string }} */ (e)?.code;
    if (code !== 'ENOENT') throw e;
  }
  return rows;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function loadDbTrails(supabase) {
  const pageSize = 1000;
  let from = 0;
  /** @type {Record<string, unknown>[]} */
  const out = [];
  for (;;) {
    const { data, error } = await supabase
      .from('trails')
      .select('id,name,onx_url,latitude,longitude')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} id
 * @param {number} lat
 * @param {number} lng
 */
async function patchTrailCoords(supabase, id, lat, lng) {
  const { error } = await supabase.from('trails').update({ latitude: lat, longitude: lng }).eq('id', id);
  if (error) throw error;
}

async function main() {
  const opts = parseArgs(process.argv);

  if (opts.patch && opts.source !== 'supabase') {
    console.error('[onx-coords] --patch only works with --supabase (cannot write merged JSON from this script).');
    process.exit(1);
  }

  /** @type {import('@supabase/supabase-js').SupabaseClient | null} */
  let patchClient = null;

  if (opts.singleUrl) {
    console.log(`[onx-coords] Fetch ${opts.singleUrl}`);
    const html = await fetchTrailHtml(opts.singleUrl);
    const ll = extractCoordsFromOnxTrailHtml(html);
    console.log(ll ? `lat=${ll.lat} lng=${ll.lng}` : 'NO_COORDS_FOUND');
    process.exit(0);
  }

  /** @type {{ id?: string; name?: string; url: string }[]} */
  let jobs = [];

  if (opts.source === 'json') {
    const rows = await loadJsonTrails();
    for (const t of rows) {
      const row = /** @type {Record<string, unknown>} */ (t);
      if (opts.missingOnly && jsonRowHasCoords(row)) continue;
      const url = canonicalWwwOnxTrailUrlFromJson(row);
      if (!url) continue;
      jobs.push({
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        url,
      });
    }
    console.log(`[onx-coords] JSON source: ${jobs.length} jobs`);
  } else {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error(
        '[onx-coords] Supabase mode requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.'
      );
      process.exit(1);
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    if (opts.patch) patchClient = supabase;

    const rows = await loadDbTrails(supabase);
    for (const t of rows) {
      const row = /** @type {{ id?: unknown; name?: unknown; onx_url?: unknown; latitude?: unknown; longitude?: unknown }} */ (
        t
      );
      if (opts.missingOnly && dbRowHasCoords(row)) continue;
      const url = canonicalWwwOnxTrailUrlFromDb(row);
      if (!url) continue;
      jobs.push({
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        url,
      });
    }
    console.log(`[onx-coords] Supabase source: ${jobs.length} jobs`);
  }

  if (opts.limit != null && opts.limit > 0) {
    jobs = jobs.slice(0, opts.limit);
    console.log(`[onx-coords] Limited to ${jobs.length} jobs`);
  }

  /** @type {CoordResult[]} */
  const results = [];

  let i = 0;
  for (const job of jobs) {
    i += 1;
    const prefix = `[${i}/${jobs.length}]`;
    try {
      const html = await fetchTrailHtml(job.url);
      const ll = extractCoordsFromOnxTrailHtml(html);
      if (!ll) {
        console.log(`${prefix} NO_EMBED ${job.id} ${job.name}`);
        results.push({ id: job.id, name: job.name, url: job.url, ok: false, error: 'no_embedded_query' });
      } else {
        console.log(`${prefix} OK ${job.id} ${job.name} → ${ll.lat},${ll.lng}`);
        results.push({
          id: job.id,
          name: job.name,
          url: job.url,
          lat: ll.lat,
          lng: ll.lng,
          ok: true,
        });
        if (opts.patch && patchClient != null && job.id) {
          await patchTrailCoords(patchClient, job.id, ll.lat, ll.lng);
          console.log(`${prefix}    patched DB`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`${prefix} ERR ${job.id} ${job.name}: ${msg}`);
      results.push({ id: job.id, name: job.name, url: job.url, ok: false, error: msg });
    }
    if (i < jobs.length && opts.delayMs > 0) await sleep(opts.delayMs);
  }

  if (opts.jsonOutput) {
    const lines = results.map((r) => JSON.stringify(r)).join('\n');
    writeFileSync(opts.jsonOutput, lines + (lines ? '\n' : ''), 'utf8');
    console.log(`[onx-coords] Wrote ${results.length} lines → ${opts.jsonOutput}`);
  }

  const ok = results.filter((r) => r.ok).length;
  console.log(`[onx-coords] Done: ${ok}/${results.length} with coordinates`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
