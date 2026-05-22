'use client';

import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Map,
  ExternalLink,
  Filter,
  Search,
  Mountain,
  ChevronRight,
  Clock,
  Ruler,
  MapPin,
  List,
  BadgeCheck,
} from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useToast } from '@/components/Toast';
import { TrailListSkeleton } from '@/components/SkeletonLoader';
import { useAuth } from '@/context/AuthContext';
import {
  mapDbTrailRow,
  sortTrailsByName,
  difficultyTierMatchesFilter,
  explorerTrailMatchesSearch,
  explorerTrailSearchRank,
  trailMatchesVehicleFilter,
  trailVehicleScopeShortLabel,
  trailVehicleScopeBadgeClass,
  ensureExplorerTrailVehicleScope,
  type ExplorerTrail,
  type DifficultyTier,
  type DifficultyFilter,
  type VehicleFilter,
} from '@/lib/trails/mapDbTrail';
import { applyCatalogTrailLinks } from '@/lib/trails/staticTrailLinks';
import { fetchAllTrailRows } from '@/lib/trails/fetchTrailsPaginated';
import { readTrailsCache, writeTrailsCache } from '@/lib/trails/offlineCache';
import {
  EXPLORER_AREA_OPTIONS,
  trailMatchesExplorerArea,
  type TrailExplorerAreaId,
} from '@/lib/trails/trailExplorerArea';
import { useSavedTrailIds } from '@/lib/hooks/useSavedTrailIds';

// Leaflet requires browser APIs — load with no SSR
const TrailMap = dynamic(() => import('@/components/TrailMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-card rounded-xl border border-border">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <p className="text-muted-foreground text-[12px]">Loading map…</p>
      </div>
    </div>
  ),
});

type Trail = ExplorerTrail;

const difficulties: DifficultyFilter[] = ['All', 'Easy', 'Moderate', 'Hard'];

const vehicleFilters: VehicleFilter[] = ['All', 'ATV', 'Truck'];

function vehicleFilterChipLabel(v: VehicleFilter): string {
  if (v === 'All') return 'All rigs';
  if (v === 'ATV') return 'ATV / SXS';
  return 'Trucks / 4×4';
}

function getDifficultyBadgeClass(tier: DifficultyTier): string {
  if (tier === 'Easy') return 'badge-beginner';
  if (tier === 'Moderate') return 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30';
  return 'badge-extreme';
}

function TrailCard({ trail, index, isSaved, onToggleSave }: {
  trail: Trail;
  index: number;
  isSaved: boolean;
  onToggleSave: (trail: Trail) => void | Promise<void>;
}) {
  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    void onToggleSave(trail);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.025 }}
      className="bg-card border border-border overflow-hidden hover:border-primary/50 transition-colors"
    >
      {/* Trail Image or title header when no photo */}
      {trail.image ? (
        <div className="relative h-40 bg-zinc-800">
          <img
            src={trail.image}
            alt={trail.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 to-transparent" />

          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-2 min-w-0">
              {trail.isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                  <BadgeCheck size={12} className="shrink-0" />
                  Verified
                </span>
              )}
              <span
                className={`inline-flex items-center px-2 py-1 text-[10px] font-black uppercase tracking-wider border shrink-0 rounded ${trailVehicleScopeBadgeClass(trail.vehicleScope)}`}
              >
                {trailVehicleScopeShortLabel(trail.vehicleScope)}
              </span>
            </div>
            <span className={`shrink-0 px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${getDifficultyBadgeClass(trail.difficultyLabel)}`}>
              {trail.difficultyLabel}
            </span>
          </div>

          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-lg font-bold text-foreground leading-tight">{trail.name}</h3>
            <p className="text-sm text-muted-foreground">{trail.location}</p>
          </div>
        </div>
      ) : (
        <div className="relative h-32 bg-zinc-800 border-b border-border px-4 py-3 flex flex-col justify-end">
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-2 min-w-0">
              {trail.isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                  <BadgeCheck size={12} className="shrink-0" />
                  Verified
                </span>
              )}
              <span
                className={`inline-flex items-center px-2 py-1 text-[10px] font-black uppercase tracking-wider border shrink-0 rounded ${trailVehicleScopeBadgeClass(trail.vehicleScope)}`}
              >
                {trailVehicleScopeShortLabel(trail.vehicleScope)}
              </span>
            </div>
            <span className={`shrink-0 px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${getDifficultyBadgeClass(trail.difficultyLabel)}`}>
              {trail.difficultyLabel}
            </span>
          </div>
          <h3 className="text-lg font-bold text-foreground leading-tight pr-16">{trail.name}</h3>
          <p className="text-sm text-muted-foreground">{trail.location}</p>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1.5">
            <Ruler size={14} />
            <span>{trail.distance}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} />
            <span>{trail.time}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Mountain size={14} />
            <span className="capitalize">{trail.terrain}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {trail.description}
        </p>

        {/* Rig Requirements */}
        {trail.rigRequirements && (
          <p className="text-xs text-primary/80 mb-4">
            Requires: {trail.rigRequirements}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {trail.onxUrl ? (
            <a
              href={trail.onxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-muted-foreground text-sm font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={15} />
              Open in onX
            </a>
          ) : (
            <span
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-zinc-800/50 text-muted-foreground text-sm font-medium cursor-not-allowed"
              title="No onX link for this trail"
            >
              <ExternalLink size={15} />
              Open in onX
            </span>
          )}
          <button
            onClick={handleSave}
            className={`flex items-center justify-center px-3 py-2.5 transition-colors ${
              isSaved
                ? 'bg-primary/15 text-primary/90 border border-primary/40'
                : 'bg-zinc-800 hover:bg-zinc-700 text-muted-foreground'
            }`}
            aria-label={isSaved ? 'Unsave trail' : 'Save trail'}
          >
            <MapPin size={15} className={isSaved ? 'fill-primary/90' : ''} />
          </button>
          <Link
            href={`/trails/${trail.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary hover:opacity-90 text-zinc-950 text-sm font-semibold transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronRight size={15} />
            Details
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export default function TrailsPage() {
  const { showToast } = useToast();
  const { supabaseClient, isConfigured, user } = useAuth();
  const { savedIds, toggleSave } = useSavedTrailIds(supabaseClient, user?.id);
  const [isLoading, setIsLoading] = useState(true);
  const [dbTrails, setDbTrails] = useState<Trail[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const handleToggleSaveTrail = useCallback(
    async (trail: Trail) => {
      if (!user) {
        showToast('Sign in to save trails to your profile', 'info');
        return;
      }
      const { saved, error } = await toggleSave(trail.id);
      if (error === 'not_authenticated') {
        showToast('Sign in to save trails', 'info');
        return;
      }
      if (error) {
        showToast(`Could not update saved trails: ${error}`, 'error');
        return;
      }
      showToast(
        saved ? `"${trail.name}" saved to your list` : `"${trail.name}" removed from saved`,
        saved ? 'success' : 'info'
      );
    },
    [user, toggleSave, showToast]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<TrailExplorerAreaId>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>('All');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleFilter>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [searchFocused, setSearchFocused] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // ── Fetch trails from Supabase only (no static JSON fallback) ─
  useEffect(() => {
    let cancelled = false;

    async function loadTrails() {
      if (!isConfigured || !supabaseClient) {
        setFetchError(
          'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.'
        );
        setDbTrails([]);
        setFromCache(false);
        setIsLoading(false);
        return;
      }

      const tryOfflineCache = () => {
        if (typeof navigator !== 'undefined' && navigator.onLine) return false;
        const cached = readTrailsCache();
        if (cached && cached.length > 0) {
          setDbTrails(
            cached.map((row) =>
              ensureExplorerTrailVehicleScope(applyCatalogTrailLinks(row as ExplorerTrail))
            )
          );
          setFetchError(null);
          setFromCache(true);
          setIsLoading(false);
          return true;
        }
        return false;
      };

      setIsLoading(true);
      setFetchError(null);
      setFromCache(false);

      if (tryOfflineCache()) return;

      let rows: Record<string, unknown>[] = [];
      try {
        rows = await fetchAllTrailRows(supabaseClient);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : typeof err === 'string' ? err : 'Failed to load trails';
        console.error('[Trail Explorer]', err);
        if (cancelled) return;
        if (tryOfflineCache()) return;
        setFetchError(message);
        setDbTrails([]);
        setIsLoading(false);
        return;
      }

      if (cancelled) return;
      const mapped = sortTrailsByName(rows.map((r) => applyCatalogTrailLinks(mapDbTrailRow(r))));
      setDbTrails(mapped);
      writeTrailsCache(mapped);
      setFromCache(false);
      setIsLoading(false);
    }

    void loadTrails();
    return () => {
      cancelled = true;
    };
  }, [supabaseClient, isConfigured]);

  const areaFilteredTrails = useMemo(() => {
    if (selectedArea === 'all') return dbTrails;
    return dbTrails.filter((t) => trailMatchesExplorerArea(t, selectedArea));
  }, [dbTrails, selectedArea]);

  // ── Filter trails: area first, then search / difficulty / vehicle ─────────────
  const filteredTrails = useMemo(() => {
    return areaFilteredTrails.filter((trail) => {
      const matchesSearch = explorerTrailMatchesSearch(trail, deferredSearchQuery);

      const diff = trail.difficulty || trail.difficultyLevel || '';
      const matchesDifficulty = difficultyTierMatchesFilter(diff, selectedDifficulty);
      const matchesVehicle = trailMatchesVehicleFilter(trail.vehicleScope, selectedVehicle);

      return matchesSearch && matchesDifficulty && matchesVehicle;
    });
  }, [areaFilteredTrails, deferredSearchQuery, selectedDifficulty, selectedVehicle]);

  const nameSuggestions = useMemo(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return [];
    const qForRank = q;
    return areaFilteredTrails
      .filter((t) => {
        const matchesSearch = explorerTrailMatchesSearch(t, q);
        const diff = t.difficulty || t.difficultyLevel || '';
        const matchesDifficulty = difficultyTierMatchesFilter(diff, selectedDifficulty);
        const matchesVehicle = trailMatchesVehicleFilter(t.vehicleScope, selectedVehicle);
        return matchesSearch && matchesDifficulty && matchesVehicle;
      })
      .sort(
        (a, b) =>
          explorerTrailSearchRank(b, qForRank) - explorerTrailSearchRank(a, qForRank) ||
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      )
      .slice(0, 15);
  }, [areaFilteredTrails, searchQuery, selectedDifficulty, selectedVehicle]);

  const showSuggest =
    searchFocused && nameSuggestions.length > 0 && searchQuery.trim().length >= 2;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border safe-top">
        <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-foreground">Trail Explorer</h1>
            <div className="flex items-center gap-2">
              {/* List / Map toggle */}
              <div className="flex items-center bg-zinc-800 rounded-lg p-0.5">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setView('list')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                    view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground/90'
                  }`}
                >
                  <List size={14} />
                  List
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setView('map')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                    view === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground/90'
                  }`}
                >
                  <Map size={14} />
                  Map
                </motion.button>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilters ? 'bg-primary text-zinc-950' : 'bg-zinc-800 text-muted-foreground'
                }`}
              >
                <Filter size={18} />
              </motion.button>
            </div>
          </div>

          {/* Search */}
          <div className="z-[60]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                aria-hidden
              />
              <input
                type="search"
                autoComplete="off"
                enterKeyHint="search"
                placeholder="Search name, area, terrain — use several words…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 160)}
                className="w-full pl-10 pr-10 py-2.5 bg-zinc-800 border border-border rounded-lg text-foreground placeholder-zinc-500 focus:outline-none focus:border-primary transition-colors"
              />
              {searchQuery.trim().length > 0 && (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSearchQuery('')}
                >
                  Clear
                </button>
              )}
              {showSuggest ? (
                <ul
                  className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-card shadow-xl shadow-black/40 py-1"
                  role="listbox"
                >
                  {nameSuggestions.map((t) => (
                    <li key={t.id} role="option" aria-selected={false}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2.5 text-[13px] text-foreground/90 hover:bg-zinc-800"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchQuery(t.name);
                          setSearchFocused(false);
                        }}
                      >
                        <span className="font-semibold text-foreground">{t.name}</span>
                        <span className="block text-[11px] text-muted-foreground truncate mt-0.5">{t.location}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
              Matches when <strong className="text-muted-foreground font-semibold">every</strong> word appears somewhere (name,
              location, description, tags, terrain…). Use the rig chips for ATV vs truck — those words are not auto-matched in search.
            </p>
          </div>

          {/* Rig type — primary explorer split */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide -mx-0.5 px-0.5">
            {vehicleFilters.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setSelectedVehicle(v)}
                className={`shrink-0 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide border transition-colors ${
                  selectedVehicle === v
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-border hover:text-foreground/90'
                }`}
              >
                {vehicleFilterChipLabel(v)}
              </button>
            ))}
          </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
              <strong className="text-muted-foreground">ATV / Trucks</strong> filters use trail metadata and keywords. “Both” is
              only when the listing clearly references both. Ambiguous rows show as <strong className="text-muted-foreground">Rig type TBD</strong> until set in the database (TBD only appears under All rigs).
            </p>

          {/* Area — narrows list, suggestions, and map pins before text search */}
          <div className="mt-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Area</p>
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide -mx-0.5 px-0.5">
              {EXPLORER_AREA_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedArea(opt.id)}
                  className={`shrink-0 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide border transition-colors ${
                    selectedArea === opt.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:border-border hover:text-foreground/90'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
              Area chips match keywords in trail name, location, and tags (no dedicated region column yet).
            </p>
          </div>
        </div>

        {/* Difficulty Filter Chips */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border"
            >
              <div className="px-4 py-3 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Rig type</p>
                  <div className="flex flex-wrap gap-2">
                    {vehicleFilters.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSelectedVehicle(v)}
                        className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                          selectedVehicle === v
                            ? 'bg-primary text-zinc-950'
                            : 'bg-zinc-800 text-muted-foreground hover:bg-zinc-700'
                        }`}
                      >
                        {vehicleFilterChipLabel(v)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Difficulty</p>
                  <div className="flex flex-wrap gap-2">
                    {difficulties.map((difficulty) => (
                      <button
                        key={difficulty}
                        onClick={() => setSelectedDifficulty(difficulty)}
                        className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                          selectedDifficulty === difficulty
                            ? 'bg-primary text-zinc-950'
                            : 'bg-zinc-800 text-muted-foreground hover:bg-zinc-700'
                        }`}
                      >
                        {difficulty}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Trail Warning */}
      <div className="px-4 py-3 bg-primary/10 border-b border-primary/20">
        <div className="flex items-center gap-2 text-primary">
          <AlertTriangle size={16} />
          <p className="text-xs font-medium">
            Always verify trail status before visiting. Conditions change.
          </p>
        </div>
      </div>

      {fromCache && (
        <div className="px-4 py-2 bg-zinc-800/80 border-b border-border">
          <p className="text-[11px] text-muted-foreground max-w-7xl mx-auto text-center">
            Offline — showing your last cached trail list from this device.
          </p>
        </div>
      )}

      {fetchError && (
        <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/25">
          <div className="flex items-start gap-2 text-red-400 max-w-7xl mx-auto">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p className="text-xs font-medium leading-relaxed">{fetchError}</p>
          </div>
        </div>
      )}

      {/* Main content — List or Map */}
      <main
        className={
          view === 'map'
            ? 'px-3 md:px-6 lg:px-10 pt-3 pb-safe-nav'
            : 'max-w-7xl mx-auto w-full px-4 md:px-8 lg:px-10 pt-4 pb-safe-nav'
        }
      >
        <AnimatePresence mode="wait">
          {view === 'map' ? (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              // height accounts for header + warning banner + bottom nav
              style={{ height: 'calc(100dvh - 168px)' }}
              className="relative"
            >
              <TrailMap trails={areaFilteredTrails} listFilteredCount={filteredTrails.length} />
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TrailListSkeleton count={6} />
            </motion.div>
          ) : dbTrails.length === 0 ? (
            <motion.div
              key="empty-db"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Mountain size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No trails loaded</h3>
              <p className="text-sm text-muted-foreground">Check your connection or Supabase configuration.</p>
            </motion.div>
          ) : selectedArea !== 'all' && areaFilteredTrails.length === 0 ? (
            <motion.div
              key="empty-area"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Mountain size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No trails in this area</h3>
              <p className="text-sm text-muted-foreground">Try another region or choose All areas.</p>
            </motion.div>
          ) : filteredTrails.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Mountain size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No trails found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="trails"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                {filteredTrails.length} trail{filteredTrails.length !== 1 ? 's' : ''} found
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTrails.map((trail, index) => (
                  <TrailCard
                    key={trail.id}
                    trail={trail}
                    index={index}
                    isSaved={savedIds.has(trail.id)}
                    onToggleSave={handleToggleSaveTrail}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
