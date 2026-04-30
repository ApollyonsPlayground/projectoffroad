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

type Difficulty = 'All' | 'Beginner' | 'Moderate' | 'Advanced' | 'Extreme';

interface Trail {
  id: string;
  name: string;
  location: string;
  difficulty: string;
  difficultyLevel?: string;
  distance?: string;
  time?: string;
  terrain?: string;
  description?: string;
  image?: string;
  mapsUrl?: string;
  onxUrl?: string;
  rigRequirements?: string;
  tags?: string[];
  latitude?: number;
  longitude?: number;
  coordinates?: string;
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
      transition={{ delay: index * 0.03 }}
      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-orange-500/50 transition-colors flex flex-col h-full"
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
      <div className="p-4 flex flex-col flex-1">
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
        <p className="text-sm text-zinc-400 line-clamp-2 mb-4 flex-grow">
          {trail.description || 'No description available.'}
        </p>

        {/* Rig Requirements */}
        {trail.rigRequirements && (
          <p className="text-xs text-orange-500/80 mb-4">
            Requires: {trail.rigRequirements}
          </p>
        )}

        {/* Action Buttons — stick to bottom */}
        <div className="flex gap-2 mt-auto">
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

  const localTrails = trailsData as Trail[];

  // ── Fetch trails from Supabase ─────────────────────────────────────────────
  useEffect(() => {
    const fetchTrails = async () => {
      // Always start with local data as fallback
      if (!supabaseClient) {
        setDbTrails(localTrails);
        setIsLoading(false);
        return;
      }

      try {
        // Try fetching all trails (don't filter by is_active since column may not exist)
        const { data, error } = await supabaseClient
          .from('trails')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.log('[v0] Supabase trails fetch error:', error.message);
          // Fall back to local JSON on error
          setDbTrails(localTrails);
          setIsLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          console.log('[v0] No trails in database, using local JSON');
          setDbTrails(localTrails);
          setIsLoading(false);
          return;
        }

        console.log('[v0] Fetched', data.length, 'trails from database');

        // Map database fields to component interface
        const mappedTrails = data.map((t: any) => ({
          id: t.id,
          name: t.name ?? t.title ?? 'Unnamed Trail',
          location: t.location ?? '',
          difficulty: t.difficulty ?? 'Moderate',
          difficultyLevel: t.difficulty ?? 'Moderate',
          distance: t.distance ?? '',
          time: t.time ?? t.duration ?? '',
          terrain: t.terrain ?? '',
          description: t.description ?? '',
          image: t.photo_url ?? t.image ?? '',
          mapsUrl: t.latitude && t.longitude
            ? `https://www.google.com/maps/search/?api=1&query=${t.latitude},${t.longitude}`
            : t.mapsUrl ?? '',
          onxUrl: t.onxUrl ?? t.onx_url ?? '',
          rigRequirements: t.rigRequirements ?? t.rig_requirements ?? '',
          tags: t.tags ?? [],
          latitude: t.latitude,
          longitude: t.longitude,
          coordinates: t.latitude && t.longitude ? `${t.latitude}, ${t.longitude}` : t.coordinates,
        }));

        setDbTrails(mappedTrails);
      } catch (err) {
        console.log('[v0] Unexpected error fetching trails:', err);
        setDbTrails(localTrails);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrails();
  }, [supabaseClient, localTrails]);

  // ── Filter trails based on search and difficulty ─────────────────────────────
  const filteredTrails = useMemo(() => {
    // Use dbTrails as the source (already includes local fallback if DB is empty)
    return dbTrails.filter((trail) => {
      // Search filter
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        q === '' ||
        trail.name.toLowerCase().includes(q) ||
        trail.location.toLowerCase().includes(q) ||
        (trail.description ?? '').toLowerCase().includes(q);

      // Difficulty filter — 'All' shows everything
      const diff = (trail.difficulty || trail.difficultyLevel || '').toLowerCase();
      const matchesDifficulty =
        selectedDifficulty === 'All' || diff === selectedDifficulty.toLowerCase();

      return matchesSearch && matchesDifficulty;
    });
  }, [dbTrails, searchQuery, selectedDifficulty]);

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

        {/* Difficulty Filter Chips — always visible */}
        <div className="px-4 py-2 border-t border-zinc-800">
          <div className="flex flex-wrap gap-2">
            {difficulties.map((difficulty) => (
              <button
                key={difficulty}
                onClick={() => setSelectedDifficulty(difficulty)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
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
      <main className={view === 'map' ? 'px-3 pt-3 pb-24' : 'max-w-6xl mx-auto px-4 pt-4 pb-24'}>
        <AnimatePresence mode="wait">
          {view === 'map' ? (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              // height accounts for header + warning banner + bottom nav
              style={{ height: 'calc(100dvh - 168px)' }}
              className="relative w-full"
            >
              <TrailMap trails={filteredTrails} />
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
            >
              <p className="text-sm text-zinc-500 mb-4">
                {filteredTrails.length} trail{filteredTrails.length !== 1 ? 's' : ''} found
              </p>
              {/* Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTrails.map((trail, index) => (
                  <TrailCard key={trail.id} trail={trail} index={index} onSave={handleSaveTrail} />
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
