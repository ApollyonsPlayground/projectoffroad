'use client';

import { useState, useEffect } from 'react';
import LeftNav from '@/components/LeftNav';
import RightSidebar from '@/components/RightSidebar';
import RigPost from '@/components/RigPost';
import DisclaimerModal from '@/components/DisclaimerModal';
import trailsData from '@/data/trails.json';
import { AlertTriangle, Plus } from 'lucide-react';
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

export default function HomePage() {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [posts, setPosts] = useState<any[]>([]);
  const [feedType, setFeedType] = useState<'rigs' | 'trails'>('rigs');
  const filteredTrails = filterTrailsByRegion(trailsData, selectedRegion);

  useEffect(() => {
    // Skip if Supabase not configured
    if (!supabase || !isSupabaseConfigured()) {
      return;
    }
    
    // Fetch posts from Supabase
    async function fetchPosts() {
      try {
        const { data, error } = await supabase
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
      {/* Left Navigation */}
      <LeftNav />

      {/* Main Feed - Center Column */}
      <main className="flex-1 max-w-2xl mx-auto w-full border-x-2 border-neutral-800">
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
              {/* New Post Button */}
              <div className="flex justify-center mb-6">
                <Link 
                  href="/posts/create"
                  className="flex items-center gap-2 px-6 py-3 bg-muted-gold hover:bg-moss text-black font-black uppercase tracking-widest transition"
                >
                  <Plus size={18} />
                  Share Your Rig
                </Link>
              </div>

              {/* Posts */}
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-neutral-400 text-lg">No posts yet</p>
                  <p className="text-neutral-500 text-sm mt-2">Be the first to share your rig!</p>
                </div>
              ) : (
                <>
                  {posts.map((post, index) => (
                    <div 
                      key={post.id} 
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <RigPost post={post} />
                    </div>
                  ))}
                </>
              )}
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
                      <span className={`px-2 py-1 text-xs font-black uppercase ${trail.status === 'Open' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                        {trail.status}
                      </span>
                    </div>
                    <p className="text-neutral-400 text-sm mb-2">{trail.location}</p>
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 bg-moss text-white text-xs">{trail.difficulty}</span>
                      <span className="px-2 py-0.5 bg-muted-gold text-black text-xs">{trail.distance}</span>
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

      {/* Right Sidebar */}
      <RightSidebar />
    </div>
  );
}