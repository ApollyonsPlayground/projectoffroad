'use client';

interface Region {
  id: string;
  name: string;
  icon: string;
  count: number;
}

const regions: Region[] = [
  { id: 'all', name: 'All Trails', icon: '🗺️', count: 0 },
  { id: 'big-bear', name: 'Big Bear', icon: '🏔️', count: 24 },
  { id: 'san-diego', name: 'San Diego', icon: '🌊', count: 20 },
  { id: 'palm-springs', name: 'Palm Springs / Idyllwild', icon: '🌴', count: 11 },
  { id: 'joshua-tree', name: 'Joshua Tree', icon: '🌵', count: 10 },
  { id: 'san-bernardino', name: 'San Bernardino', icon: '🔥', count: 3 },
  { id: 'other', name: 'Other Areas', icon: '📍', count: 11 },
];

interface RegionFilterProps {
  onRegionChange: (regionId: string) => void;
  selectedRegion: string;
}

export default function RegionFilter({ onRegionChange, selectedRegion }: RegionFilterProps) {
  return (
    <div className="mb-12">
      {/* Region Tabs */}
      <div className="flex flex-wrap justify-center gap-3">
        {regions.map((region) => (
          <button
            key={region.id}
            onClick={() => onRegionChange(region.id)}
            className={`
              flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300
              ${selectedRegion === region.id 
                ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' 
                : 'bg-stone-800/50 text-stone-400 hover:bg-stone-700 hover:text-stone-200 border border-stone-700 hover:border-stone-600'
              }
            `}
          >
            <span className="text-lg">{region.icon}</span>
            <span>{region.name}</span>
            <span className={`
              ml-1 px-2 py-0.5 rounded-full text-xs
              ${selectedRegion === region.id 
                ? 'bg-primary/30 text-primary/60' 
                : 'bg-stone-700 text-stone-500'
              }
            `}>
              {region.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { regions };