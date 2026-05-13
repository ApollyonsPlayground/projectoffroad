'use client';

import { useState } from 'react';
import { MapPin, Mountain, Waves, Palmtree, Flame, ChevronRight } from 'lucide-react';
import TrailCard from './TrailCard';
import type { Trail } from './TrailCard';

interface Region {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  count: number;
  description: string;
}

const regions: Region[] = [
  { 
    id: 'big-bear', 
    name: 'Big Bear', 
    icon: <Mountain className="text-blue-400" size={32} />,
    color: 'blue',
    count: 24,
    description: 'Mountain trails, lakes & forests'
  },
  { 
    id: 'san-diego', 
    name: 'San Diego', 
    icon: <Waves className="text-teal-400" size={32} />,
    color: 'teal',
    count: 20,
    description: 'Coastal ranges & desert canyons'
  },
  { 
    id: 'palm-springs', 
    name: 'Palm Springs', 
    icon: <Palmtree className="text-green-400" size={32} />,
    color: 'green',
    count: 11,
    description: 'Desert oases & mountain climbs'
  },
  { 
    id: 'joshua-tree', 
    name: 'Joshua Tree', 
    icon: <Flame className="text-orange-400" size={32} />,
    color: 'orange',
    count: 10,
    description: 'Desert landscapes & rock formations'
  },
];

interface RegionCardsProps {
  trails: Trail[];
}

export default function RegionCards({ trails }: RegionCardsProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  
  // Filter trails by selected region
  const filteredTrails = selectedRegion 
    ? trails.filter(trail => {
        const loc = (trail.location || '').toLowerCase();
        const tags = (trail.tags || []).map((t: string) => t.toLowerCase());
        
        switch (selectedRegion) {
          case 'big-bear':
            return loc.includes('big bear') || tags.includes('big bear');
          case 'san-diego':
            return loc.includes('san diego') || tags.includes('san diego');
          case 'palm-springs':
            return loc.includes('palm springs') || loc.includes('idyllwild') || tags.includes('palm springs') || tags.includes('idyllwild');
          case 'joshua-tree':
            return loc.includes('joshua tree') || tags.includes('joshua tree');
          default:
            return true;
        }
      })
    : [];

  if (selectedRegion) {
    const regionInfo = regions.find(r => r.id === selectedRegion);
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button 
          onClick={() => setSelectedRegion(null)}
          className="flex items-center gap-2 text-orange-400 hover:text-orange-300 font-medium"
        >
          <ChevronRight className="rotate-180" size={20} />
          Back to Regions
        </button>

        {/* Region header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-stone-800 rounded-full mb-4">
            {regionInfo?.icon}
          </div>
          <h3 className="text-2xl font-bold text-stone-50">{regionInfo?.name}</h3>
          <p className="text-stone-400">{filteredTrails.length} trails in this region</p>
        </div>

        {/* Trail cards - 1 column for mobile */}
        <div className="grid grid-cols-1 gap-4">
          {filteredTrails.map((trail) => (
            <TrailCard key={trail.id} trail={trail} />
          ))}
        </div>
      </div>
    );
  }

  // Show region cards
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {regions.map((region) => (
        <button
          key={region.id}
          onClick={() => setSelectedRegion(region.id)}
          className={`
            relative p-6 rounded-2xl border-2 text-left transition-all hover:scale-[1.02]
            bg-stone-900/50 border-stone-700 hover:border-stone-500
            group
          `}
        >
          {/* Icon */}
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-stone-800 rounded-xl flex items-center justify-center">
              {region.icon}
            </div>
            <ChevronRight className="text-stone-600 group-hover:text-orange-400 transition-colors" />
          </div>

          {/* Info */}
          <h3 className="text-xl font-bold text-stone-50 mb-1">{region.name}</h3>
          <p className="text-stone-400 text-sm mb-3">{region.description}</p>
          
          {/* Count badge */}
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-stone-800 rounded-full">
            <MapPin size={14} className="text-orange-400" />
            <span className="text-orange-400 font-semibold">{region.count}</span>
            <span className="text-stone-500 text-sm">trails</span>
          </div>
        </button>
      ))}
    </div>
  );
}