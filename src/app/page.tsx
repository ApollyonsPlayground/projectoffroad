'use client';

import { useState } from 'react';
import LeftNav from '@/components/LeftNav';
import RightSidebar from '@/components/RightSidebar';
import TrailCard from '@/components/TrailCard';
import DisclaimerModal from '@/components/DisclaimerModal';
import trailsData from '@/data/trails.json';
import { AlertTriangle } from 'lucide-react';

// Region filter function
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
  const filteredTrails = filterTrailsByRegion(trailsData, selectedRegion);

  return (
    <div className="flex min-h-screen bg-neutral-950">
      {/* Left Navigation */}
      <LeftNav />

      {/* Main Feed - Center Column */}
      <main className="flex-1 max-w-2xl mx-auto w-full border-x-2 border-neutral-800">
        {/* Disclaimer Header */}
        <div className="sticky top-0 z-50 bg-orange-900/90 backdrop-blur-sm border-b-2 border-orange-700 px-4 py-2">
          <div className="flex items-center gap-2 text-orange-100 text-xs font-bold uppercase">
            <AlertTriangle size={14} />
            <span>Off-roading is dangerous. Verify closures before travel.</span>
          </div>
        </div>

        {/* Feed Filter Tabs */}
        <div className="sticky top-10 z-40 bg-neutral-900 border-b-2 border-neutral-800">
          <div className="flex">
            {['all', 'big-bear', 'san-diego', 'palm-springs', 'joshua-tree', 'san-bernardino'].map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${
                  selectedRegion === region 
                    ? 'bg-orange-600 text-white border-b-4 border-white' 
                    : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                {region === 'all' ? 'All Trails' : region.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Feed Content */}
        <div className="p-4 space-y-4">
          <DisclaimerModal />
          
          {filteredTrails.map((trail, index) => (
            <TrailCard key={trail.id} trail={trail} index={index} />
          ))}
          
          {filteredTrails.length === 0 && (
            <div className="text-center py-12 border-2 border-neutral-800 bg-neutral-900">
              <p className="text-neutral-400 font-bold uppercase">No trails found in this region.</p>
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar */}
      <RightSidebar />
    </div>
  );
}