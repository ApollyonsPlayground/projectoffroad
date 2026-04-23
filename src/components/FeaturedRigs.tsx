'use client';

import { useState, useEffect } from 'react';
import { Award, Plus } from 'lucide-react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase';

interface FeaturedRig {
  id: string;
  image_url: string;
  user_name: string;
  vehicle: string;
}

export default function FeaturedRigs() {
  const [rigs, setRigs] = useState<FeaturedRig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeaturedRigs() {
      // Skip if Supabase not configured
      if (!supabase || !isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('id, image_url, user_name, rig_specs')
          .limit(4);
        
        if (error) throw error;
        
        // Map to FeaturedRig format - handle both JSON and text vehicle
        const mapped = (data || []).map((post: any) => ({
          id: post.id,
          image_url: post.image_url,
          user_name: post.user_name,
          vehicle: post.rig_specs?.vehicle || post.rig_specs || 'Offroad Rig'
        }));
        
        setRigs(mapped);
      } catch (err) {
        console.error('Error fetching featured rigs:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFeaturedRigs();
  }, []);

  return (
    <div className="bg-neutral-900 border-2 border-neutral-800 p-4">
      <h3 className="flex items-center gap-2 font-black uppercase tracking-wider text-muted-gold mb-4">
        <Award size={18} />
        Featured Rigs
      </h3>

      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="aspect-square bg-neutral-800 animate-pulse"></div>
          ))}
        </div>
      ) : rigs.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {rigs.map((rig) => (
            <div key={rig.id} className="relative aspect-square group overflow-hidden border border-neutral-700">
              <img 
                src={rig.image_url} 
                alt={rig.vehicle}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-1 left-1 right-1">
                  <p className="text-xs font-bold text-white truncate">{rig.user_name}</p>
                  <p className="text-xs text-neutral-400 truncate">{rig.vehicle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-neutral-700 p-6 text-center">
          <p className="text-neutral-500 text-sm font-bold uppercase tracking-wide mb-3">
            No featured rigs yet
          </p>
          <Link 
            href="/posts/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-muted-gold hover:bg-moss text-black text-xs font-black uppercase transition-colors"
          >
            <Plus size={14} />
            Share Your Rig
          </Link>
        </div>
      )}
    </div>
  );
}