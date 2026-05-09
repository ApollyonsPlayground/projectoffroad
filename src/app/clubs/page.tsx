'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  Users,
  Shield,
  Star,
  Instagram,
  Globe,
  ChevronDown,
  Plus,
  Navigation,
  Loader2,
  Building2,
} from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { ClubListSkeleton } from '@/components/SkeletonLoader';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { useAuth } from '@/context/AuthContext';

interface Club {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  banner_image?: string;
  description: string;
  location: string;
  region: string;
  verified: boolean;
  premium: boolean;
  member_count?: number;
  website_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  lat?: number;
  lng?: number;
  distance?: number;
}

function normalizeClubFromDb(row: Record<string, unknown>): Club {
  const inst = row.instagram_url ?? row.instagram;
  let instagram_url: string | undefined;
  if (typeof inst === 'string' && inst.trim().length > 0) {
    const t = inst.trim();
    instagram_url = t.startsWith('http') ? t : `https://instagram.com/${t.replace(/^@/, '')}`;
  }
  const web = row.website_url ?? row.website;
  const member_count = typeof row.member_count === 'number' ? row.member_count : undefined;

  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? 'Club'),
    slug: String(row.slug ?? ''),
    logo: row.logo as string | undefined,
    banner_image: row.banner_image as string | undefined,
    description: String(row.description ?? ''),
    location: String(row.location ?? ''),
    region: String(row.region ?? 'Other'),
    verified: Boolean(row.verified),
    premium: Boolean(row.premium),
    member_count,
    website_url: typeof web === 'string' && web.trim() ? web.trim() : undefined,
    instagram_url,
    facebook_url: row.facebook_url as string | undefined,
    lat: typeof row.lat === 'number' ? row.lat : undefined,
    lng: typeof row.lng === 'number' ? row.lng : undefined,
  };
}

const regions = ['All Regions', 'Inland Empire', 'Orange County', 'Big Bear', 'San Diego', 'Los Angeles', 'High Desert'];

function ClubPosterCard({ club, index }: { club: Club; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative aspect-[3/4] overflow-hidden rounded-xl group"
    >
      {/* Full Poster Background */}
      <div className="absolute inset-0">
        {club.banner_image ? (
          <img
            src={club.banner_image}
            alt={club.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>

      {/* Top Badges */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
        <div className="flex gap-2">
          {club.verified && (
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/30 backdrop-blur-sm text-blue-400 text-xs font-bold border border-blue-500/40 rounded">
              <Shield size={12} />
              Verified
            </span>
          )}
          {club.premium && (
            <span className="flex items-center gap-1 px-2 py-1 bg-orange-500/30 backdrop-blur-sm text-orange-400 text-xs font-bold border border-orange-500/40 rounded">
              <Star size={12} />
              Premium
            </span>
          )}
        </div>
        {club.distance !== undefined && (
          <span className="flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-xs font-semibold rounded">
            <Navigation size={12} className="text-orange-500" />
            {club.distance < 1 ? '<1' : Math.round(club.distance)} mi
          </span>
        )}
      </div>

      {/* Content at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {/* Logo */}
        <div className="w-16 h-16 rounded-full bg-zinc-900/90 backdrop-blur-sm border-2 border-orange-500/50 overflow-hidden mb-3 shadow-xl">
          {club.logo ? (
            <img
              src={club.logo}
              alt={club.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-orange-500 text-2xl font-bold">
              {club.name[0]}
            </div>
          )}
        </div>

        {/* Name & Location */}
        <h3 className="text-xl font-bold text-white mb-1 text-balance">{club.name}</h3>
        <div className="flex items-center gap-1.5 text-sm text-zinc-300 mb-2">
          <MapPin size={14} className="text-orange-500" />
          <span>{club.location}</span>
        </div>

        {/* Member Count */}
        <div className="flex items-center gap-1.5 text-sm text-zinc-400 mb-4">
          <Users size={14} />
          <span>{club.member_count || 0} members</span>
        </div>

        {/* Social Buttons - Prominent */}
        <div className="flex gap-2 mb-3">
          {club.instagram_url && (
            <motion.a
              whileTap={{ scale: 0.95 }}
              href={club.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold rounded-lg transition-all"
            >
              <Instagram size={18} />
              Instagram
            </motion.a>
          )}
          {club.website_url && (
            <motion.a
              whileTap={{ scale: 0.95 }}
              href={club.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-800/80 hover:bg-zinc-700 backdrop-blur-sm text-white text-sm font-semibold rounded-lg transition-colors border border-zinc-700"
            >
              <Globe size={18} />
              Website
            </motion.a>
          )}
        </div>

        <Link
          href={`/clubs/${club.id}`}
          className="block w-full py-3 text-center bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-lg transition-colors"
        >
          View Club
        </Link>
      </div>
    </motion.article>
  );
}

// Calculate distance between two coordinates in miles
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function ClubsPage() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [configMissing, setConfigMissing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [myClubs, setMyClubs] = useState<{ id: string; name: string }[]>([]);

  // Request user location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoadingLocation(false);
      },
      () => {
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    async function fetchClubs() {
      if (!supabase || !isSupabaseConfigured()) {
        setClubs([]);
        setConfigMissing(true);
        setFetchFailed(false);
        setIsLoading(false);
        return;
      }

      setConfigMissing(false);
      try {
        const { data, error } = await supabase
          .from('clubs')
          .select('*')
          .order('verified', { ascending: false })
          .order('premium', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFetchFailed(false);
        setClubs(
          data?.length ? (data as Record<string, unknown>[]).map((row) => normalizeClubFromDb(row)) : []
        );
      } catch (err) {
        console.error('Error fetching clubs:', err);
        setFetchFailed(true);
        setClubs([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClubs();
  }, []);

  useEffect(() => {
    if (!user || !supabase || !isSupabaseConfigured()) {
      setMyClubs([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data: mem } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', user.id)
        .eq('status', 'approved');
      if (cancelled) return;
      const ids = [...new Set((mem ?? []).map((m: { club_id: string }) => m.club_id).filter(Boolean))];
      if (!ids.length) {
        setMyClubs([]);
        return;
      }
      const { data: crows } = await supabase.from('clubs').select('id, name').in('id', ids);
      if (cancelled) return;
      setMyClubs(
        (crows ?? []).map((c: { id: string; name: string | null }) => ({
          id: c.id,
          name: String(c.name ?? 'Club'),
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Add distance to clubs and sort by proximity
  const clubsWithDistance = useMemo(() => {
    if (!userLocation) return clubs;
    
    return clubs.map(club => ({
      ...club,
      distance: club.lat && club.lng 
        ? calculateDistance(userLocation.lat, userLocation.lng, club.lat, club.lng)
        : undefined,
    })).sort((a, b) => {
      // Sort by distance if available, otherwise keep original order
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      if (a.distance !== undefined) return -1;
      if (b.distance !== undefined) return 1;
      return 0;
    });
  }, [clubs, userLocation]);

  const filteredClubs = useMemo(() => {
    return clubsWithDistance.filter((club) => {
      const matchesSearch = searchQuery === '' ||
        club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRegion = selectedRegion === 'All Regions' ||
        club.region === selectedRegion;

      return matchesSearch && matchesRegion;
    });
  }, [clubsWithDistance, searchQuery, selectedRegion]);

  // Group filtered clubs by region for the "All Regions" view
  const groupedClubs = useMemo(() => {
    if (selectedRegion !== 'All Regions') {
      return { [selectedRegion]: filteredClubs };
    }
    return filteredClubs.reduce<Record<string, Club[]>>((acc, club) => {
      const region = club.region || 'Other';
      if (!acc[region]) acc[region] = [];
      acc[region].push(club);
      return acc;
    }, {});
  }, [filteredClubs, selectedRegion]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h1 className="text-xl font-bold text-foreground shrink-0">Clubs</h1>
            <Link
              href="/clubs/create"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors shrink-0"
            >
              <Plus size={16} />
              Create club
            </Link>
          </div>
          {!user && (
            <p className="text-[11px] text-muted-foreground mb-2 -mt-1">
              Sign in with Google when prompted — then you&apos;ll land on the form to register your org.
            </p>
          )}

          {/* Location status */}
          {isLoadingLocation && (
            <div className="flex items-center gap-1.5 mb-2 text-[11px] text-muted-foreground">
              <Loader2 size={11} className="animate-spin text-orange-500" />
              Finding nearby clubs...
            </div>
          )}
          {userLocation && !isLoadingLocation && (
            <div className="flex items-center gap-1.5 mb-2 text-[11px] text-muted-foreground">
              <Navigation size={11} className="text-orange-500" />
              Sorted by distance from you
            </div>
          )}
          {!userLocation && !isLoadingLocation && (
            <button
              type="button"
              onClick={() => requestLocation()}
              className="w-full mb-2 flex items-center justify-center gap-2 px-3 py-2 bg-card border border-border text-[12px] text-foreground hover:bg-muted transition-colors"
            >
              <Navigation size={14} className="text-orange-500" />
              Use my location to sort nearby clubs
            </button>
          )}

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Region Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRegionDropdown(!showRegionDropdown)}
              className="flex items-center justify-between w-full px-3 py-2 bg-card border border-border text-sm text-foreground"
            >
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-orange-500" />
                <span>{selectedRegion}</span>
              </div>
              <ChevronDown size={16} className={`transition-transform ${showRegionDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showRegionDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-card border border-border z-20 max-h-48 overflow-y-auto"
                >
                  {regions.map((region) => (
                    <button
                      key={region}
                      onClick={() => {
                        setSelectedRegion(region);
                        setShowRegionDropdown(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                        selectedRegion === region
                          ? 'bg-primary/15 text-primary'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Club List */}
      <main className="max-w-md mx-auto px-4 pt-4 pb-24">
        <div className="mb-5 rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Clubs directory</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Browse groups by region, request to join, then approved members can host official club runs. New here?{' '}
                <Link href="/clubs/create/" className="text-primary hover:underline font-medium">
                  Register your club
                </Link>{' '}
                or{' '}
                <Link href="/runs/" className="text-primary hover:underline font-medium">
                  browse runs
                </Link>
                .
              </p>
            </div>
          </div>
          {myClubs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Your clubs</p>
              <div className="flex flex-wrap gap-2">
                {myClubs.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clubs/${c.id}/`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-foreground text-xs font-medium border border-border hover:border-primary/50 transition-colors max-w-full truncate"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ClubListSkeleton count={4} />
            </motion.div>
          ) : filteredClubs.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Users size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No clubs found</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery
                  ? 'Try a different search term'
                  : fetchFailed
                    ? 'Could not load clubs. Check your connection and refresh the page.'
                    : configMissing
                      ? 'Database is not configured for this build — clubs from Supabase will show here once connected.'
                      : 'Be the first to register a club in this directory.'}
              </p>
              {!searchQuery && (
                <Link
                  href="/clubs/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors"
                >
                  <Plus size={16} />
                  Create club
                </Link>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="clubs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {Object.entries(groupedClubs).map(([region, regionClubs]) => (
                <div key={region} className="mb-6">
                  {selectedRegion === 'All Regions' && (
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                      <MapPin size={14} className="text-orange-500" />
                      {region}
                    </h2>
                  )}
                  <div className="grid grid-cols-1 gap-4">
                    {regionClubs.map((club, index) => (
                      <ClubPosterCard key={club.id} club={club} index={index} />
                    ))}
                  </div>
                </div>
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
