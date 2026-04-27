'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  Users, 
  Shield, 
  Star,
  Instagram,
  Facebook,
  Globe,
  ChevronDown,
  Plus
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
}

// Placeholder clubs for demo
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
    website_url: 'https://example.com',
    instagram_url: 'https://instagram.com',
    facebook_url: 'https://facebook.com',
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
    instagram_url: 'https://instagram.com',
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
    facebook_url: 'https://facebook.com',
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
    instagram_url: 'https://instagram.com',
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
    website_url: 'https://example.com',
  },
];

const regions = ['All Regions', 'Inland Empire', 'Orange County', 'Big Bear', 'San Diego', 'Los Angeles', 'High Desert'];

function ClubCard({ club, index }: { club: Club; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08 }}
      className="bg-zinc-900 border border-zinc-800 overflow-hidden hover:border-orange-500/50 transition-colors"
    >
      {/* Club Banner / Poster */}
      <div className="relative h-36 bg-zinc-800">
        {club.banner_image ? (
          <img
            src={club.banner_image}
            alt={club.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
        
        {/* Badges */}
        <div className="absolute top-3 right-3 flex gap-2">
          {club.verified && (
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30">
              <Shield size={12} />
              Verified
            </span>
          )}
          {club.premium && (
            <span className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-semibold border border-orange-500/30">
              <Star size={12} />
              Premium
            </span>
          )}
        </div>
      </div>

      {/* Club Info */}
      <div className="p-4">
        <div className="flex items-start gap-4 mb-3">
          {/* Logo */}
          <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex-shrink-0 -mt-10 relative z-10">
            {club.logo ? (
              <img
                src={club.logo}
                alt={club.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xl font-bold">
                {club.name[0]}
              </div>
            )}
          </div>
          
          {/* Name & Location */}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-bold text-white truncate">{club.name}</h3>
            <div className="flex items-center gap-1 text-sm text-zinc-500">
              <MapPin size={12} />
              <span className="truncate">{club.location}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-400 line-clamp-2 mb-4">
          {club.description}
        </p>

        {/* Stats & Social */}
        <div className="flex items-center justify-between">
          {/* Member Count */}
          <div className="flex items-center gap-1.5 text-sm text-zinc-500">
            <Users size={14} />
            <span>{club.member_count || 0} members</span>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-2">
            {club.website_url && (
              <a
                href={club.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                <Globe size={16} />
              </a>
            )}
            {club.instagram_url && (
              <a
                href={club.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-pink-400 transition-colors"
              >
                <Instagram size={16} />
              </a>
            )}
            {club.facebook_url && (
              <a
                href={club.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-blue-400 transition-colors"
              >
                <Facebook size={16} />
              </a>
            )}
          </div>
        </div>

        {/* View Club Button */}
        <Link
          href={`/clubs/${club.id}`}
          className="block mt-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-center text-sm font-semibold text-white transition-colors"
        >
          View Club
        </Link>
      </div>
    </motion.article>
  );
}

export default function ClubsPage() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);

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

  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const matchesSearch = searchQuery === '' ||
        club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRegion = selectedRegion === 'All Regions' ||
        club.region === selectedRegion;

      return matchesSearch && matchesRegion;
    });
  }, [clubs, searchQuery, selectedRegion]);

  // Group clubs by region for display
  const groupedClubs = useMemo(() => {
    if (selectedRegion !== 'All Regions') {
      return { [selectedRegion]: filteredClubs };
    }

    const groups: Record<string, Club[]> = {};
    filteredClubs.forEach((club) => {
      const region = club.region || 'Other';
      if (!groups[region]) groups[region] = [];
      groups[region].push(club);
    });
    return groups;
  }, [filteredClubs, selectedRegion]);

  return (
    <div className="min-h-screen bg-background">
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
      <main className="max-w-lg mx-auto px-4 pt-14 pb-24">
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
                  <div className="space-y-4">
                    {regionClubs.map((club, index) => (
                      <ClubCard key={club.id} club={club} index={index} />
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
