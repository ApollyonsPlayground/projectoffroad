'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useToast } from '@/components/Toast';
import { TrailListSkeleton } from '@/components/SkeletonLoader';
import { useAuth } from '@/context/AuthContext';
import trailsData from '@/data/trails.json';

/** Parse "34.3031, -117.4524" or Google Maps URL into [lat, lng]. */
function parseCoordinates(trail: { coordinates?: string; mapsUrl?: string }): { lat: number; lng: number } | null {
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
  return null;
}

// Leaflet requires browser APIs — load with no SSR
const TrailMap = dynamic(() => import('@/components/TrailMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-900 rounded-xl border border-zinc-800">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
        <p className="text-zinc-500 text-[12px]">Loading map…</p>
      </div>
    </div>
  ),
});

type Difficulty = 'All' | 'Beginner' | 'Intermediate' | 'Moderate' | 'Advanced' | 'Extreme';

interface Trail {
  id: string;
  name: string;
  location: string;
  difficulty: string;
  difficultyLevel?: string;
  distance: string;
  time: string;
  terrain: string;
  description: string;
  image?: string;
  mapsUrl?: string;
  onxUrl?: string;
  rigRequirements?: string;
  tags?: string[];
}

const difficulties: Difficulty[] = ['All', 'Beginner', 'Moderate', 'Advanced', 'Extreme'];

function getDifficultyBadgeClass(difficulty: string): string {
  const level = difficulty.toLowerCase();
  if (level === 'beginner' || level === 'easy') return 'badge-beginner';
  if (level === 'moderate' || level === 'intermediate') return 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30';
  if (level === 'advanced' || level === 'challenging') return 'badge-advanced';
  if (level === 'extreme' || level === 'expert') return 'badge-extreme';
  return 'bg-zinc-700/50 text-zinc-400 border border-zinc-600';
}

function TrailCard({ trail, index, onSave }: {
  trail: Trail;
  index: number;
  onSave: (trail: Trail) => void;
}) {
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    onSave(trail);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-zinc-900 border border-zinc-800 overflow-hidden hover:border-orange-500/50 transition-colors"
    >
      {/* Trail Image */}
      {trail.image && (
        <div className="relative h-40 bg-zinc-800">
          <img
            src={trail.image}
            alt={trail.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 to-transparent" />
          
          {/* Difficulty Badge Overlay */}
          <div className="absolute top-3 right-3">
            <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${getDifficultyBadgeClass(trail.difficulty)}`}>
              {trail.difficulty}
            </span>
          </div>
          
          {/* Trail Name Overlay */}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-lg font-bold text-white leading-tight">{trail.name}</h3>
            <p className="text-sm text-zinc-400">{trail.location}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-zinc-500 mb-3">
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
        <p className="text-sm text-zinc-400 line-clamp-2 mb-4">
          {trail.description}
        </p>

        {/* Rig Requirements */}
        {trail.rigRequirements && (
          <p className="text-xs text-orange-500/80 mb-4">
            Requires: {trail.rigRequirements}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <a
            href={trail.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trail.name + ' ' + trail.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Map size={15} />
            Maps
          </a>
          <a
            href={trail.onxUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={15} />
            onX
          </a>
          <button
            onClick={handleSave}
            className={`flex items-center justify-center px-3 py-2.5 transition-colors ${
              saved
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/40'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
            }`}
            aria-label={saved ? 'Unsave trail' : 'Save trail'}
          >
            <MapPin size={15} className={saved ? 'fill-orange-400' : ''} />
          </button>
          <Link
            href={`/trails/${trail.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 text-sm font-semibold transition-colors"
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
  const { supabaseClient } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [dbTrails, setDbTrails] = useState<Trail[]>([]);

  const handleSaveTrail = useCallback((trail: Trail) => {
    showToast(`"${trail.name}" saved to your trail list`, 'success');
  }, [showToast]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');

  const trails = trailsData as Trail[];

  // ── Task 1: Upsert all trail coordinates from JSON into Supabase ────────────
  const upsertTrailCoordinates = useCallback(async () => {
    if (!supabaseClient) return;
    const rows = trails.map((t) => {
      const coords = parseCoordinates(t as any);
      return {
        id: t.id,
        name: t.name,
        location: t.location,
        difficulty: t.difficulty || t.difficultyLevel,
        description: t.description,
        photo_url: t.image ?? null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      };
    });
    // Upsert in batches to avoid request size limits
    const BATCH_SIZE = 20;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      await supabaseClient
        .from('trails')
        .upsert(rows.slice(i, i + BATCH_SIZE), { onConflict: 'id' });
    }
  }, [supabaseClient, trails]);

  // ── Task 2: Fetch trails from Supabase for the map ──────────────────────────
  useEffect(() => {
    if (!supabaseClient) return;
    // Run upsert first, then fetch
    upsertTrailCoordinates().then(() => {
      supabaseClient
        .from('trails')
        .select('id, name, location, difficulty, description, photo_url, latitude, longitude')
        .order('name', { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 0) {
            setDbTrails(
              data.map((t: any) => ({
                ...t,
                image: t.photo_url,
                coordinates: t.latitude && t.longitude ? `${t.latitude}, ${t.longitude}` : undefined,
              }))
            );
          }
        });
    });
  }, [supabaseClient, upsertTrailCoordinates]);

  const filteredTrails = useMemo(() => {
    return trails.filter((trail) => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        trail.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trail.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trail.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Difficulty filter
      const matchesDifficulty = selectedDifficulty === 'All' || 
        trail.difficulty.toLowerCase() === selectedDifficulty.toLowerCase() ||
        trail.difficultyLevel?.toLowerCase() === selectedDifficulty.toLowerCase();

      return matchesSearch && matchesDifficulty;
    });
  }, [trails, searchQuery, selectedDifficulty]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-zinc-800 safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-white">Trail Explorer</h1>
            <div className="flex items-center gap-2">
              {/* List / Map toggle */}
              <div className="flex items-center bg-zinc-800 rounded-lg p-0.5">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setView('list')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                    view === 'list' ? 'bg-orange-500 text-black' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <List size={14} />
                  List
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setView('map')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                    view === 'map' ? 'bg-orange-500 text-black' : 'text-zinc-400 hover:text-zinc-200'
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
                  showFilters ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                <Filter size={18} />
              </motion.button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search trails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        {/* Difficulty Filter Chips */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-zinc-800"
            >
              <div className="px-4 py-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Difficulty</p>
                <div className="flex flex-wrap gap-2">
                  {difficulties.map((difficulty) => (
                    <button
                      key={difficulty}
                      onClick={() => setSelectedDifficulty(difficulty)}
                      className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                        selectedDifficulty === difficulty
                          ? 'bg-orange-500 text-zinc-950'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Trail Warning */}
      <div className="px-4 py-3 bg-orange-500/10 border-b border-orange-500/20">
        <div className="flex items-center gap-2 text-orange-500">
          <AlertTriangle size={16} />
          <p className="text-xs font-medium">
            Always verify trail status before visiting. Conditions change.
          </p>
        </div>
      </div>

      {/* Main content — List or Map */}
      <main className={view === 'map' ? 'px-3 pt-3 pb-24' : 'max-w-md mx-auto px-4 pt-4 pb-24'}>
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
              <TrailMap trails={dbTrails.length > 0 ? dbTrails : trails} />
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TrailListSkeleton count={5} />
            </motion.div>
          ) : filteredTrails.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Mountain size={48} className="mx-auto text-zinc-700 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-400 mb-2">No trails found</h3>
              <p className="text-sm text-zinc-600">
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
              <p className="text-sm text-zinc-500">
                {filteredTrails.length} trail{filteredTrails.length !== 1 ? 's' : ''} found
              </p>
              {filteredTrails.map((trail, index) => (
                <TrailCard key={trail.id} trail={trail} index={index} onSave={handleSaveTrail} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
