'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  MapPin, 
  Shield, 
  Truck, 
  Settings, 
  LogOut,
  ChevronRight,
  Plus,
  Edit2,
  Camera,
  Award,
  Calendar,
  Heart
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { ProfileSkeleton } from '@/components/SkeletonLoader';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase';

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  modifications?: string;
  is_primary: boolean;
}

// Placeholder profile for demo
const placeholderProfile = {
  name: 'Trail Rider',
  email: 'user@example.com',
  avatar_url: null,
  bio: 'Off-road enthusiast exploring SoCal trails. Always looking for new adventures and build ideas.',
  location: 'San Bernardino, CA',
  experience_level: 'Intermediate',
  runs_completed: 12,
  trails_visited: 24,
  posts_count: 8,
};

const placeholderVehicles: Vehicle[] = [
  {
    id: '1',
    year: 2018,
    make: 'Jeep',
    model: 'Wrangler JK',
    modifications: '37" KO2s, 4" lift, winch, rock sliders',
    is_primary: true,
  },
];

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'runs' | 'saved'>('posts');

  useEffect(() => {
    if (!loading && !user) {
      // In demo mode, show placeholder
      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        setVehicles(placeholderVehicles);
        return;
      }
      router.push('/login');
      return;
    }

    if (user) {
      fetchVehicles();
    } else {
      // Demo mode
      setVehicles(placeholderVehicles);
      setIsLoading(false);
    }
  }, [user, loading, router]);

  async function fetchVehicles() {
    if (!supabase || !isSupabaseConfigured() || !user) {
      setVehicles(placeholderVehicles);
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id);

      setVehicles(data?.length ? data : placeholderVehicles);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setVehicles(placeholderVehicles);
    } finally {
      setIsLoading(false);
    }
  }

  const displayProfile = profile || placeholderProfile;

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-lg mx-auto">
          <ProfileSkeleton />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Profile Header */}
      <header className="bg-black border-b border-zinc-800 safe-top">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white">Profile</h1>
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className="p-2 bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <Settings size={20} />
              </Link>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-zinc-800 overflow-hidden ring-2 ring-orange-500/50">
                {displayProfile.avatar_url ? (
                  <img
                    src={displayProfile.avatar_url}
                    alt={displayProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={32} className="text-zinc-600" />
                  </div>
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-zinc-950">
                <Camera size={14} />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{displayProfile.name}</h2>
              <div className="flex items-center gap-1 text-sm text-zinc-500">
                <MapPin size={12} />
                <span>{displayProfile.location || 'Location not set'}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className={`px-2 py-0.5 text-xs font-semibold ${
                  displayProfile.experience_level === 'Beginner' ? 'badge-beginner' :
                  displayProfile.experience_level === 'Intermediate' ? 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30' :
                  'badge-advanced'
                }`}>
                  {displayProfile.experience_level}
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {displayProfile.bio && (
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              {displayProfile.bio}
            </p>
          )}

          {/* Stats */}
          <div className="flex justify-around mt-4 py-4 border-t border-zinc-800">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{displayProfile.posts_count || 0}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{displayProfile.runs_completed || 0}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Runs</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{displayProfile.trails_visited || 0}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Trails</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 pt-4 pb-24">
        {/* Vehicles Section */}
        <section className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Truck size={18} className="text-orange-500" />
              Your Rigs
            </h3>
            <button className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-400">
              <Plus size={16} />
              Add
            </button>
          </div>

          {vehicles.length > 0 ? (
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900 border border-zinc-800 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        {vehicle.is_primary && (
                          <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-semibold uppercase">
                            Primary
                          </span>
                        )}
                      </div>
                      {vehicle.modifications && (
                        <p className="text-sm text-zinc-500 mt-1">{vehicle.modifications}</p>
                      )}
                    </div>
                    <button className="p-2 text-zinc-500 hover:text-white">
                      <Edit2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-zinc-900 border border-dashed border-zinc-700">
              <Truck size={32} className="mx-auto text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-500">No rigs added yet</p>
              <button className="mt-3 text-sm text-orange-500 hover:text-orange-400">
                Add your first rig
              </button>
            </div>
          )}
        </section>

        {/* Quick Links */}
        <section className="p-4">
          <h3 className="font-semibold text-white mb-3">Quick Links</h3>
          <div className="space-y-2">
            <Link
              href="/achievements"
              className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Award size={20} className="text-orange-500" />
                <span className="text-white">Achievements</span>
              </div>
              <ChevronRight size={18} className="text-zinc-600" />
            </Link>
            
            <Link
              href="/runs?filter=completed"
              className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-orange-500" />
                <span className="text-white">Run History</span>
              </div>
              <ChevronRight size={18} className="text-zinc-600" />
            </Link>
            
            <Link
              href="/saved"
              className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Heart size={20} className="text-orange-500" />
                <span className="text-white">Saved Trails</span>
              </div>
              <ChevronRight size={18} className="text-zinc-600" />
            </Link>
            
            <Link
              href="/settings"
              className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings size={20} className="text-orange-500" />
                <span className="text-white">Settings</span>
              </div>
              <ChevronRight size={18} className="text-zinc-600" />
            </Link>
          </div>
        </section>

        {/* Sign Out */}
        {user && (
          <section className="p-4">
            <button
              onClick={() => {
                // Handle sign out
                router.push('/login');
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 border border-red-500/20 text-red-400 font-medium hover:bg-red-500/20 transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
