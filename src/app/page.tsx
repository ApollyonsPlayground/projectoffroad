'use client';

import { useState, useEffect } from 'react';
import LeftNav, { DesktopNav } from '@/components/LeftNav';
import RightSidebar from '@/components/RightSidebar';
import RigPost from '@/components/RigPost';
import DisclaimerModal from '@/components/DisclaimerModal';
import trailsData from '@/data/trails.json';
import { AlertTriangle, Plus, Menu, Home, Compass, Users, User, Settings } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase';
import Link from 'next/link';

// Posts will be fetched from Supabase
// No hardcoded sample data

// Region filter function for trails
function filterTrailsByRegion(trails: typeof trailsData, regionId: string) {
  if (regionId === 'all') return trails;
  
  return trails.filter(trail => {
    const loc = (trail.location || '').toLowerCase();
    const tags = (trail.tags || []).map(t => t.toLowerCase());
    
    switch (regionId) {
      case 'big-bear':
        return loc.includes('big bear') || tags.includes('big bear');
      case 'san-diego':
        return loc.includes('san diego') || tags.includes('san diego');
      case 'palm-springs':
        return loc.includes('palm springs') || loc.includes('idyllwild') || tags.includes('palm springs') || tags.includes('idyllwild');
      case 'joshua-tree':
        return loc.includes('joshua tree') || tags.includes('joshua tree');
      case 'san-bernardino':
        return loc.includes('san bernardino') || loc.includes('cajon') || loc.includes('lytle') || tags.includes('san bernardino');
      default:
        return true;
    }
  });
}

// Mobile bottom nav items
const mobileNavItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/runs', label: 'Runs', icon: Compass },
  { href: '/clubs', label: 'Clubs', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function HomePage() {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [posts, setPosts] = useState<any[]>([]);
  const [feedType, setFeedType] = useState<'rigs' | 'trails'>('rigs');
  const [menuOpen, setMenuOpen] = useState(false);
  const filteredTrails = filterTrailsByRegion(trailsData, selectedRegion);
  
  // Pre-compute posts content to avoid JSX ternary nesting issues
  const postsContent = posts.length === 0 ? (
    <div className="text-center py-12">
      <p className="text-neutral-400 text-lg">No posts yet</p>
      <p className="text-neutral-500 text-sm mt-2">Be the first to share your rig!</p>
    </div>
  ) : (
    <>
      {posts.map((post, index) => (
        <div key={post.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
          <RigPost post={post} />
        </div>
      ))}
    </>
  );

  useEffect(() => {
    // Skip if Supabase not configured
    if (!supabase || !isSupabaseConfigured()) {
      return;
    }
    
    // Fetch posts from Supabase
    async function fetchPosts() {
      try {
        const { data, error } = await supabase!
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        setPosts(data || []);
      } catch (err) {
        console.error('Error fetching posts:', err);
        // Keep empty array on error
      }
    }
    fetchPosts();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#050705]">
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setMenuOpen(true)}
        className="fixed top-4 left-4 z-30 p-2 bg-neutral-900/90 rounded-lg border border-neutral-700 md:hidden"
      >
        <Menu size={24} className="text-white" />
      </button>

      {/* Left Navigation (Mobile Drawer, Desktop Sidebar) */}
      <LeftNav isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      
      {/* Desktop Only LeftNav */}
      <div className="hidden md:block">
        <DesktopNav />
      </div>

      {/* Main Feed - Center Column */}
      <main className="flex-1 max-w-2xl mx-auto w-full border-x-2 border-neutral-800 pb-20 md:pb-0">
        {/* Disclaimer Header */}
        <div className="sticky top-0 z-50 bg-moss/90 backdrop-blur-sm border-b-2 border-muted-gold px-4 py-2">
          <div className="flex items-center gap-2 text-muted-gold text-xs font-bold uppercase">
            <AlertTriangle size={14} />
            <span>Off-roading is dangerous. Verify closures before travel.</span>
          </div>
        </div>

        {/* Feed Type Toggle - Instagram style */}
        <div className="sticky top-10 z-40 bg-[#050705] border-b-2 border-neutral-800">
          <div className="flex">
            <button
              onClick={() => setFeedType('rigs')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${
                feedType === 'rigs' 
                  ? 'bg-muted-gold text-black border-b-4 border-white' 
                  : 'bg-[#050705] text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              Rig Feed
            </button>
            <button
              onClick={() => setFeedType('trails')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${
                feedType === 'trails' 
                  ? 'bg-muted-gold text-black border-b-4 border-white' 
                  : 'bg-[#050705] text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              Trails
            </button>
          </div>
        </div>

        {/* Feed Content */}
        <div className="p-4 space-y-4">
          <DisclaimerModal />
          
          {feedType === 'rigs' ? (
            // Rig Feed - Instagram style
            <>
              {/* Desktop New Post Button */}
              <div className="hidden md:flex justify-center mb-6">
                <Link 
                  href="/posts/create"
                  className="flex items-center gap-2 px-6 py-3 bg-[#FF8C00] hover:bg-[#FF9D00] text-white font-black uppercase tracking-widest transition"
                >
                  <Plus size={18} />
                  Share Your Rig
                </Link>
              </div>

              {/* Posts */}
              {postsContent}
            </>
          ) : (
            // Trails Feed
            <>
              {/* Region Filter Tabs */}
              <div className="flex flex-wrap gap-1 mb-4">
                {['all', 'big-bear', 'san-diego', 'palm-springs', 'joshua-tree', 'san-bernardino'].map((region) => (
                  <button
                    key={region}
                    onClick={() => setSelectedRegion(region)}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                      selectedRegion === region 
                        ? 'bg-muted-gold text-black' 
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                    }`}
                  >
                    {region === 'all' ? 'All' : region.replace('-', ' ')}
                  </button>
                ))}
              </div>

              {/* Trails */}
              {filteredTrails.map((trail, index) => (
                <div 
                  key={trail.id} 
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Use a simplified trail card or embed TrailCard */}
                  <div className="rounded-none border-2 border-neutral-800 bg-neutral-900 mb-4 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-white uppercase tracking-wide">{trail.name}</h3>
                      {/* Status badge removed - external links added below */}
                    </div>
                    <p className="text-neutral-400 text-sm mb-2">{trail.location}</p>
                    <div className="flex gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-moss text-white text-xs">{trail.difficulty}</span>
                      <span className="px-2 py-0.5 bg-muted-gold text-black text-xs">{trail.distance}</span>
                    </div>
                    {/* Navigation Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <a 
                        href={trail.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trail.name + ' ' + trail.location)}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold uppercase transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                        Maps
                      </a>
                      <a 
                        href={trail.onxUrl || '#'}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                        onX
                      </a>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredTrails.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-neutral-800 bg-neutral-900">
                  <p className="text-neutral-400 font-bold uppercase">No trails found in this region.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Right Sidebar - Desktop Only */}
      <div className="hidden md:block">
        <RightSidebar />
      </div>

      {/* Mobile FAB - Share Your Rig */}
      <Link 
        href="/posts/create"
        className="fixed bottom-20 right-4 z-30 flex items-center justify-center w-14 h-14 bg-[#FF8C00] hover:bg-[#FF9D00] rounded-full shadow-lg shadow-orange-900/30 md:hidden"
      >
        <Plus size={28} className="text-white" />
      </Link>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 flex justify-around py-2 z-30 md:hidden">
        {mobileNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 text-neutral-400 hover:text-orange-500"
          >
            <item.icon size={20} />
            <span className="text-xs font-bold uppercase">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}