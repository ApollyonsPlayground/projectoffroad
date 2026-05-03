'use client';

import { Mountain, MapPin, Gauge } from 'lucide-react';

interface Trail {
  id: string;
  name: string;
  location: string;
  difficulty: string;
  coordinates: string;
  status: string;
  tags: string[];
  description: string;
}

interface TrailGridProps {
  trails: Trail[];
  onSelectTrail: (trail: Trail) => void;
}

const difficultyColors: Record<string, string> = {
  'Easy': 'bg-[#2d5a27] text-[#f5f5dc]',
  'Easy to Moderate': 'bg-[#4a7c36] text-[#f5f5dc]',
  'Moderate': 'bg-[#8b7355] text-[#f5f5dc]',
  'Moderate to Advanced': 'bg-[#a0522d] text-[#f5f5dc]',
  'Advanced': 'bg-[#8b4513] text-[#f5f5dc]',
  'Extreme': 'bg-[#5d4e37] text-[#f5f5dc]',
};

// Nature images for trail cards
const natureImages = [
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=600&q=80',
  'https://images.unsplash.com/photo-1511884642898-4c92249f20b6?w=600&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&q=80',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80',
];

export default function TrailGrid({ trails, onSelectTrail }: TrailGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {trails.map((trail, index) => (
        <div 
          key={trail.id} 
          className="bg-white rounded-lg shadow-lg overflow-hidden border border-[#e6dcc8] hover:shadow-xl transition-shadow"
        >
          {/* Nature image header */}
          <div 
            className="h-40 relative"
            style={{
              backgroundImage: `url(${natureImages[index % natureImages.length]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-3 left-3 right-3">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${difficultyColors[trail.difficulty] || 'bg-[#5d4e37] text-[#f5f5dc]'}`}>
                {trail.difficulty}
              </span>
            </div>
          </div>

          <div className="p-5">
            <h3 className="text-xl font-bold text-[#2c2416] mb-2">{trail.name}</h3>
            
            <div className="flex items-center gap-1 text-[#5d4e37] text-sm mb-3">
              <MapPin size={14} />
              <span>{trail.location}</span>
            </div>

            <p className="text-[#2c2416] text-sm mb-4 line-clamp-2">{trail.description}</p>

            <div className="flex flex-wrap gap-1 mb-4">
              {trail.tags.slice(0, 2).map((tag) => (
                <span 
                  key={tag} 
                  className="inline-block bg-[#f0ebe0] text-[#5d4e37] px-2 py-1 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => onSelectTrail(trail)}
                className="flex-1 bg-[#2d5a27] text-[#f5f5dc] py-2 px-4 rounded hover:bg-[#1e3d1a] transition-colors text-sm font-medium"
              >
                View Trail
              </button>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trail.name + ' ' + trail.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-[#8b4513] text-[#f5f5dc] py-2 px-4 rounded hover:bg-[#d2691e] transition-colors text-sm font-medium text-center"
              >
                Maps
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
