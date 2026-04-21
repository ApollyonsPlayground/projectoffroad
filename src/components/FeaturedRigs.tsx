'use client';

import { useState, useEffect } from 'react';
import { Award, Plus } from 'lucide-react';
import Link from 'next/link';

interface FeaturedRig {
  id: string;
  image_url: string;
  user_name: string;
  vehicle: string;
}

// Placeholder - would fetch from posts table in production
const sampleFeaturedRigs: FeaturedRig[] = [
  { id: '1', image_url: 'https://images.unsplash.com/photo-1600712242805-5f78671b24da?w=400', user_name: 'DesertKing', vehicle: ' Jeep Wrangler' },
  { id: '2', image_url: 'https://images.unsplash.com/photo-1513106580091-1d82408b8cd9?w=400', user_name: 'RockWalker', vehicle: 'Toyota 4Runner' },
  { id: '3', image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400', user_name: 'TrailBlazer', vehicle: 'Ford Bronco' },
];

export default function FeaturedRigs() {
  const [rigs, setRigs] = useState<FeaturedRig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production: fetch from Supabase posts table where status='approved'
    // For now use placeholders
    setTimeout(() => {
      setRigs(sampleFeaturedRigs);
      setLoading(false);
    }, 500);
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