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
  Loader2
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

// Placeholder clubs for demo with lat/lng for proximity sorting
const placeholderClubs: Club[] = [
  {
    id: '1',
    name: 'SoCal Crawlers',
    slug: 'socal-crawlers',
    logo: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200&q=80',
    banner_image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80',
    description: 'Rock crawling enthusiasts tackling the toughest trails in Southern California. Weekly runs and build nights.',
    location: 'San Bernardino, CA',
    region: 'Inland Empire',
    verified: true,
    premium: true,
    member_count: 245,
    website_url: 'https://socalcrawlers.com',
    instagram_url: 'https://instagram.com/socalcrawlers',
    lat: 34.1083,
    lng: -117.2898,
  },
  {
    id: '2',
    name: 'Desert Runners OC',
    slug: 'desert-runners-oc',
    logo: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=200&q=80',
    banner_image: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&q=80',
    description: 'Orange County based club specializing in desert runs. Glamis, Ocotillo, and Johnson Valley regulars.',
    location: 'Irvine, CA',
    region: 'Orange County',
    verified: true,
    premium: false,
    member_count: 189,
    instagram_url: 'https://instagram.com/desertrunnersoc',
    lat: 33.6846,
    lng: -117.8265,
  },
  {
    id: '3',
    name: 'Big Bear Wheelers',
    slug: 'big-bear-wheelers',
    logo: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200&q=80',
    banner_image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    description: 'Local knowledge of every trail in Holcomb Valley. New members welcome - we run all skill levels.',
    location: 'Big Bear Lake, CA',
    region: 'Big Bear',
    verified: true,
    premium: false,
    member_count: 156,
    website_url: 'https://bigbearwheelers.org',
    lat: 34.2439,
    lng: -116.9114,
  },
  {
    id: '4',
    name: 'Tacoma TRD Club SD',
    slug: 'tacoma-trd-sd',
    logo: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200&q=80',
    banner_image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800&q=80',
    description: 'Toyota Tacoma owners group focused on overlanding and trail exploration in San Diego county.',
    location: 'San Diego, CA',
    region: 'San Diego',
    verified: false,
    premium: false,
    member_count: 98,
    instagram_url: 'https://instagram.com/tacomatrdsd',
    lat: 32.7157,
    lng: -117.1611,
  },
  {
    id: '5',
    name: 'LA Overland Collective',
    slug: 'la-overland-collective',
    banner_image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
    description: 'Multi-day overland trips and camping adventures. RTT enthusiasts and adventure seekers.',
    location: 'Los Angeles, CA',
    region: 'Los Angeles',
    verified: false,
    premium: false,
    member_count: 134,
    website_url: 'https://laoverlandcollective.com',
    instagram_url: 'https://instagram.com/laoverland',
    lat: 34.0522,
    lng: -118.2437,
  },
];

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

        {/* View Club Button */}
        <Link href={`/clubs/${club.id}`}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-zinc-950 text-sm font-bold rounded-lg transition-colors"
          >
            View Club
          </motion.button>
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

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

  // Try to get location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    async function fetchClubs() {
      if (!supabase || !isSupabaseConfigured()) {
        setClubs(placeholderClubs);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('clubs')
          .select('*')
          .order('verified', { ascending: false })
          .order('premium', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setClubs(data?.length ? data : placeholderClubs);
      } catch (err) {
        console.error('Error fetching clubs:', err);
        setClubs(placeholderClubs);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClubs();
  }, []);

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
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-zinc-800 safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-white">Clubs</h1>
            {user && (
              <Link
                href="/clubs/create"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-zinc-950 text-sm font-semibold transition-colors"
              >
                <Plus size={16} />
                Create
              </Link>
            )}
          </div>

          {/* Location status */}
          {isLoadingLocation && (
            <div className="flex items-center gap-1.5 mb-2 text-[11px] text-zinc-500">
              <Loader2 size={11} className="animate-spin text-orange-500" />
              Finding nearby clubs...
            </div>
          )}
          {userLocation && !isLoadingLocation && (
            <div className="flex items-center gap-1.5 mb-2 text-[11px] text-zinc-500">
              <Navigation size={11} className="text-orange-500" />
              Sorted by distance from you
            </div>
          )}

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Region Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRegionDropdown(!showRegionDropdown)}
              className="flex items-center justify-between w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-sm text-zinc-300"
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
                  className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 z-20 max-h-48 overflow-y-auto"
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
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'text-zinc-300 hover:bg-zinc-700'
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
              <Users size={48} className="mx-auto text-zinc-700 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-400 mb-2">No clubs found</h3>
              <p className="text-sm text-zinc-600 mb-6">
                {searchQuery ? 'Try a different search term' : 'Be the first to start a club in this area'}
              </p>
              {user && !searchQuery && (
                <Link
                  href="/clubs/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 text-sm font-semibold transition-colors"
                >
                  <Plus size={16} />
                  Create Club
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
                    <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
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
