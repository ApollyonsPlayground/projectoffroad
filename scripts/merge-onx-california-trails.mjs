/**
 * Build California trail stubs from onX listing pages: trail URL, name, miles, tech rating → difficulty,
 * and “Best Time” seasons → `time` hint (onX does not publish trip duration on these listing cards).
 * Writes `src/data/trails-ca-onx-stubs.json` so we don't balloon the client bundle:
 * `staticTrailLinks` only imports `trails.json`; stubs are seed-only via `npm run seed:trails`.
 *
 * Usage:
 *   node scripts/merge-onx-california-trails.mjs           # dry-run (counts only)
 *   node scripts/merge-onx-california-trails.mjs --write # writes stubs JSON
 *
 * Respectful delays between requests; stop after pages with no matching links.
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const trailsPath = join(__dirname, '../src/data/trails.json');
const stubsOutPath = join(__dirname, '../src/data/trails-ca-onx-stubs.json');

const LIST_BASE = 'https://www.onxmaps.com/offroad/trails/us/california';
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80';

const DESC =
  'Maps, difficulty, and trail info on onX Offroad (open their trail page — we do not use onX photos here).';

/** Maps onX “Tech Rating” 1–10 to app difficulty strings used by `upsert-trails`. */
function difficultyFromTechRating(rating) {
  const n = Number(rating);
  if (!Number.isFinite(n)) return 'Moderate';
  if (n <= 3) return 'Beginner';
  if (n <= 5) return 'Intermediate';
  if (n <= 7) return 'Advanced';
  return 'Extreme';
}

/**
 * Each listing card uses `offroad-area-trails__item` with stats in stat-wrapper blocks.
 * @returns {Map<string, { slug: string; title: string; difficulty: string; distance: string; time: string }>}
 */
function parseListingTrailItems(html) {
  const chunks = html.split('<div class="offroad-area-trails__item">');
  /** @type {Map<string, { slug: string; title: string; difficulty: string; distance: string; time: string }>} */
  const bySlug = new Map();

  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const hm = chunk.match(/href="\/offroad\/trails\/us\/california\/([^"]+)"/);
    if (!hm) continue;
    const slug = hm[1].trim();
    const slugKey = slug.toLowerCase();

    const titleH3 = chunk.match(/<h3>([^<]+)<\/h3>/);
    const titleLink = chunk.match(/Learn more about ([^<]+)<\/a>/);
    const title = (titleH3?.[1] ?? titleLink?.[1] ?? slug).trim();

    const milesM = chunk.match(
      /offroad-area-trails__stat-header">Total Miles<\/div><div class="offroad-area-trails__stat-detail">([\d.]+)<\/div>/
    );
    const techM = chunk.match(
      /offroad-area-trails__stat-header">Tech Rating<\/div><div class="offroad-area-trails__stat-detail">[\s\S]*?<span[^>]*>(\d+)<\/span>/
    );

    const bestM = chunk.match(
      /offroad-area-trails__stat-header">Best Time<\/div><div class="offroad-area-trails__stat-detail">([^<]+)<\/div>/
    );

    const miles = milesM?.[1];
    const techNum = techM?.[1];
    const difficulty =
      techNum != null ? difficultyFromTechRating(parseInt(techNum, 10)) : 'Moderate';

    const distance = miles != null ? `${miles} mi` : '—';

    const bestSeason = bestM?.[1]?.trim();
    const time =
      bestSeason != null && bestSeason.length > 0
        ? `Best seasons: ${bestSeason} · trip time varies (see onX)`
        : '—';

    bySlug.set(slugKey, { slug, title, difficulty, distance, time });
  }

  return bySlug;
}

function slugToId(slug) {
  const lower = String(slug).trim().toLowerCase();
  return `ca-${lower.replace(/\./g, '-')}`;
}

/** @returns {string | null} */
function californiaTrailPathFromOnxUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = url.startsWith('http') ? new URL(url) : new URL(url, 'https://www.onxmaps.com');
    const path = u.pathname.replace(/\/$/, '').toLowerCase();
    const prefix = '/offroad/trails/us/california/';
    if (!path.startsWith(prefix)) return null;
    const rest = path.slice(prefix.length);
    if (!rest || rest.includes('/')) return null;
    return path;
  } catch {
    return null;
  }
}

async function fetchPage(page) {
  const url = page <= 1 ? LIST_BASE : `${LIST_BASE}?page=${page}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; SoCalOffroadersTrailIndexer/1.0; +https://socaloffroaders.com)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const write = process.argv.includes('--write');

  const rawJson = readFileSync(trailsPath, 'utf8');
  /** @type {Record<string, unknown>[]} */
  const existing = JSON.parse(rawJson);

  const existingCaPaths = new Set();
  const existingIds = new Set();
  for (const t of existing) {
    existingIds.add(String(t.id ?? ''));
    const path = californiaTrailPathFromOnxUrl(String(t.onxUrl ?? ''));
    if (path) existingCaPaths.add(path);
  }

  /** @type {Map<string, { slug: string; title: string; difficulty: string; distance: string; time: string }>} */
  const scraped = new Map();
  let emptyStreak = 0;

  for (let page = 1; page <= 160; page++) {
    process.stderr.write(`\rFetching listing page ${page}…`);
    let html;
    try {
      html = await fetchPage(page);
    } catch (e) {
      console.error(`\nPage ${page} failed:`, e?.message ?? e);
      emptyStreak++;
      if (emptyStreak >= 2) break;
      await sleep(600);
      continue;
    }

    const pageItems = parseListingTrailItems(html);
    if (pageItems.size === 0) {
      emptyStreak++;
      if (emptyStreak >= 2) break;
    } else {
      emptyStreak = 0;
      for (const p of pageItems.values()) {
        scraped.set(p.slug.toLowerCase(), p);
      }
    }

    await sleep(450);
  }

  process.stderr.write('\n');

  const additions = [];
  for (const { slug, title, difficulty, distance, time } of scraped.values()) {
    const pathSlug = encodeURIComponent(slug).replace(/%2F/gi, '/');
    const onxUrl = `https://www.onxmaps.com/offroad/trails/us/california/${pathSlug}`;
    const path = `/offroad/trails/us/california/${slug.toLowerCase()}`;
    if (existingCaPaths.has(path)) continue;

    const id = slugToId(slug);
    if (existingIds.has(id)) continue;

    existingCaPaths.add(path);
    existingIds.add(id);

    additions.push({
      id,
      name: title,
      location: 'California',
      difficulty,
      difficultyLevel: difficulty,
      status: 'Open',
      distance,
      time,
      terrain: 'off-road',
      rigRequirements: 'Varies by trail — check onX for vehicle width and seasonal closures.',
      tags: ['California', 'OHV'],
      description: DESC,
      image: FALLBACK_IMAGE,
      onxUrl,
      isVerified: false,
    });
  }

  additions.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  console.log(`Listing trails scraped (unique slugs): ${scraped.size}`);
  console.log(`New trails to append (not already in trails.json): ${additions.length}`);

  if (!write) {
    console.log('\nDry-run only. Re-run with --write to write src/data/trails-ca-onx-stubs.json');
    return;
  }

  writeFileSync(stubsOutPath, `${JSON.stringify(additions, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${additions.length} stub trails → ${stubsOutPath}`);
  console.log('Next: npm run seed:trails (service role) to sync Supabase.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
