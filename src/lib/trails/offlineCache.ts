import type { ExplorerTrail } from '@/lib/trails/mapDbTrail';

const CACHE_KEY = 'socal_trails_cache_v2';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function readTrailsCache(): ExplorerTrail[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts?: number; trails?: ExplorerTrail[] };
    if (!parsed?.trails || !Array.isArray(parsed.trails)) return null;
    if (!parsed.ts || Date.now() - parsed.ts > MAX_AGE_MS) return null;
    return parsed.trails;
  } catch {
    return null;
  }
}

export function writeTrailsCache(trails: ExplorerTrail[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), trails }));
  } catch {
    /* quota / private mode */
  }
}
