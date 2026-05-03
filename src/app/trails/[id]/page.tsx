'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Ruler,
  AlertTriangle,
  Truck,
  Tag,
  ExternalLink,
  Map,
  BookmarkPlus,
  BookmarkCheck,
  Share2,
  Users,
  ChevronRight,
  BadgeCheck,
} from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { mapDbTrailRow, type ExplorerTrail, type DifficultyTier } from '@/lib/trails/mapDbTrail';
import { applyCatalogTrailLinks } from '@/lib/trails/staticTrailLinks';
import { useSavedTrailIds } from '@/lib/hooks/useSavedTrailIds';

type Trail = ExplorerTrail;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function difficultyColorTier(tier: DifficultyTier) {
  if (tier === 'Easy') return 'bg-green-500/15 text-green-400 border-green-500/30';
  if (tier === 'Moderate') return 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30';
  return 'bg-red-500/15 text-red-400 border-red-500/30';
}

function DifficultyDot({ tier }: { tier: DifficultyTier }) {
  const dots: DifficultyTier[] = ['Easy', 'Moderate', 'Hard'];
  const colors = ['bg-green-500', 'bg-yellow-500', 'bg-red-500'];
  const idx = dots.indexOf(tier);
  return (
    <div className="flex items-center gap-1" aria-label={`Difficulty: ${tier}`}>
      {dots.map((_, i) => (
        <span
          key={i}
          className={`w-2.5 h-2.5 rounded-full ${i <= idx && idx >= 0 ? colors[idx] : 'bg-zinc-800'}`}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { supabaseClient, isConfigured, user } = useAuth();
  const { savedIds, toggleSave } = useSavedTrailIds(supabaseClient, user?.id);

  const [trail, setTrail] = useState<Trail | null>(null);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    let cancelled = false;

    async function loadTrail() {
      setLoading(true);
      setLoadError(null);

      if (!isConfigured || !supabaseClient) {
        setTrail(null);
        setLoadError(
          'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.'
        );
        setLoading(false);
        return;
      }

      const { data, error } = await supabaseClient.from('trails').select('*').eq('id', id).maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('[trail detail]', error);
        setTrail(null);
        setLoadError(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setTrail(null);
        setLoadError(null);
        setLoading(false);
        return;
      }

      setTrail(applyCatalogTrailLinks(mapDbTrailRow(data as Record<string, unknown>)));
      setLoading(false);
    }

    void loadTrail();
    return () => {
      cancelled = true;
    };
  }, [id, supabaseClient, isConfigured]);

  const trailId = typeof id === 'string' ? id : '';
  const isSaved = trailId ? savedIds.has(trailId) : false;

  const handleSave = useCallback(async () => {
    if (!trailId) return;
    if (!user) {
      showToast('Sign in to save trails to your profile', 'info');
      return;
    }
    const { saved, error } = await toggleSave(trailId);
    if (error === 'not_authenticated') {
      showToast('Sign in to save trails', 'info');
      return;
    }
    if (error) {
      showToast(`Could not update: ${error}`, 'error');
      return;
    }
    showToast(
      saved ? 'Trail saved to your list' : 'Trail removed from saved',
      saved ? 'success' : 'info'
    );
  }, [trailId, user, toggleSave, showToast]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: trail?.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard', 'success');
      }
    } catch {
      showToast('Could not share trail', 'error');
    }
  }, [trail, showToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-9 h-9 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
        <p className="text-zinc-500 text-[14px]">Loading trail…</p>
        <BottomNav />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle size={36} className="text-red-500/80" />
        <p className="text-zinc-400 text-[15px] text-center max-w-sm">{loadError}</p>
        <Link href="/trails" className="text-[14px] text-orange-500 hover:text-orange-400">
          Back to trails
        </Link>
        <BottomNav />
      </div>
    );
  }

  if (!trail) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle size={36} className="text-zinc-700" />
        <p className="text-zinc-500 text-[15px]">Trail not found</p>
        <Link href="/trails" className="text-[14px] text-orange-500 hover:text-orange-400">
          Back to trails
        </Link>
        <BottomNav />
      </div>
    );
  }

  const diffClass = difficultyColorTier(trail.difficultyLabel);

  return (
    <div className="min-h-screen bg-black">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-xl border-b border-zinc-900">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1.5 text-zinc-400 hover:text-white transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-[15px] font-bold text-white truncate mx-3 flex-1 text-center">{trail.name}</h1>
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleSave}
              className="p-2 text-zinc-400 hover:text-orange-400 transition-colors"
              aria-label={isSaved ? 'Remove from saved' : 'Save trail'}
            >
              {isSaved ? <BookmarkCheck size={20} className="text-orange-500" /> : <BookmarkPlus size={20} />}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleShare}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
              aria-label="Share trail"
            >
              <Share2 size={18} />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-28">
        {/* Hero image */}
        {trail.image && !imageError ? (
          <div className="relative h-52 bg-zinc-900 overflow-hidden">
            <img
              src={trail.image}
              alt={trail.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start justify-end gap-2">
              {trail.isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                  <BadgeCheck size={12} />
                  Verified
                </span>
              )}
              {trail.status && (
                <span className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-full border ${
                  trail.status === 'Open' ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
                }`}>
                  {trail.status}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="h-36 bg-zinc-950 border-b border-zinc-900 flex items-center justify-center">
            <MapPin size={28} className="text-zinc-800" />
          </div>
        )}

        {/* Title + difficulty */}
        <div className="px-4 pt-4 pb-3 border-b border-zinc-900">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-[20px] font-bold text-white leading-tight text-balance">{trail.name}</h2>
              <div className="flex items-center gap-1 mt-1 text-[13px] text-zinc-500">
                <MapPin size={13} />
                <span>{trail.location}</span>
              </div>
            </div>
            <span className={`mt-1 px-2.5 py-1 text-[11px] font-bold uppercase border rounded-full flex-shrink-0 ${diffClass}`}>
              {trail.difficultyLabel}
            </span>
          </div>
          <div className="mt-3">
            <DifficultyDot tier={trail.difficultyLabel} />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 divide-x divide-zinc-900 border-b border-zinc-900">
          {[
            { icon: Ruler, label: 'Distance', value: trail.distance },
            { icon: Clock, label: 'Est. Time', value: trail.time },
            {
              icon: MapPin,
              label: 'Terrain',
              value: (() => {
                const t = trail.terrain || 'off-road';
                return t.charAt(0).toUpperCase() + t.slice(1);
              })(),
            },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-1 py-3.5 px-2">
              <Icon size={17} className="text-orange-500" />
              <span className="text-[13px] font-semibold text-white">{value}</span>
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>

        {/* Description */}
        <div className="px-4 py-4 border-b border-zinc-900">
          <h3 className="text-[12px] font-bold text-zinc-500 uppercase tracking-wider mb-2">About this Trail</h3>
          <p className="text-[14px] text-zinc-300 leading-relaxed">{trail.description}</p>
        </div>

        {/* Rig Requirements */}
        {trail.rigRequirements && (
          <div className="px-4 py-4 border-b border-zinc-900">
            <h3 className="text-[12px] font-bold text-zinc-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Truck size={14} className="text-orange-500" /> Rig Requirements
            </h3>
            <p className="text-[14px] text-zinc-300 leading-relaxed">{trail.rigRequirements}</p>
          </div>
        )}

        {/* Tags */}
        {trail.tags && trail.tags.length > 0 && (
          <div className="px-4 py-4 border-b border-zinc-900">
            <h3 className="text-[12px] font-bold text-zinc-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Tag size={14} className="text-orange-500" /> Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {trail.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-[12px] text-zinc-400 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Coordinates */}
        {trail.coordinates && (
          <div className="px-4 py-3 border-b border-zinc-900">
            <p className="text-[11px] text-zinc-600 uppercase tracking-wider">Coordinates</p>
            <p className="text-[13px] text-zinc-400 font-mono mt-0.5">{trail.coordinates}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-4 pt-5 space-y-3">
          {trail.mapsUrl && (
            <a
              href={trail.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-black font-bold text-[15px] rounded-xl transition-colors"
              onClick={() => showToast('Opening Google Maps', 'info')}
            >
              <Map size={18} /> Open in Maps
            </a>
          )}
          {trail.onxUrl && (
            <a
              href={trail.onxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-zinc-900 border border-zinc-700 hover:border-orange-500/40 text-white font-semibold text-[14px] rounded-xl transition-colors"
              onClick={() => showToast('Opening in onX Off-Road', 'info')}
            >
              <ExternalLink size={16} /> View on onX Off-Road
            </a>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-zinc-950 border border-zinc-800 hover:border-orange-500/30 text-zinc-300 font-semibold text-[14px] rounded-xl transition-colors"
          >
            {isSaved
              ? <><BookmarkCheck size={16} className="text-orange-500" /> Saved to your list</>
              : <><BookmarkPlus size={16} /> Save this Trail</>
            }
          </motion.button>

          {/* Find a run on this trail */}
          <Link
            href={`/runs?trail=${encodeURIComponent(trail.name)}`}
            className="flex items-center justify-between w-full py-3.5 px-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-colors"
            onClick={() => showToast('Finding runs on this trail', 'info')}
          >
            <div className="flex items-center gap-2 text-zinc-300 text-[14px] font-semibold">
              <Users size={16} className="text-orange-500" />
              Find a group run
            </div>
            <ChevronRight size={16} className="text-zinc-600" />
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
