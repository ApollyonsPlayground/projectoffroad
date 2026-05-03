"use client";

import { useState } from 'react';
import { MapPin, Navigation, Mountain, Clock, Wrench } from 'lucide-react';

interface Trail {
  id: string;
  name: string;
  location: string;
  coordinates: string;
  difficulty: string;
  difficultyLevel: string;
  status: string;
  distance: string;
  time: string;
  terrain: string;
  rigRequirements: string;
  tags: string[];
  description: string;
  image: string;
  onxUrl: string;
  mapsUrl: string;
}

interface TrailCardProps {
  trail: Trail;
  index: number;
}

const difficultyColors: Record<string, { bg: string; text: string; border: string }> = {
  'Beginner': { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-700/50' },
  'Moderate': { bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-700/50' },
  'Advanced': { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-700/50' },
  'Extreme': { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-700/50' },
};

export default function TrailCard({ trail, index }: TrailCardProps) {
  const colors = difficultyColors[trail.difficulty] || difficultyColors['Advanced'];
  const [imageError, setImageError] = useState(false);
  
  // Use the trail's specific image

  return (
    <div className="rounded-none border-2 border-neutral-800 bg-neutral-900 mb-4">
      {/* Image Section with Fallback */}
      <div className="relative h-48 overflow-hidden">
        {!imageError ? (
          <>
            <img 
              src={trail.image}
              alt={trail.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-transparent" />
          </>
        ) : (
          /* Fallback UI for broken/missing images */
          <div className="absolute inset-0 bg-stone-800 flex flex-col items-center justify-center">
            <Mountain size={48} className="text-stone-600 mb-2" />
            <span className="text-stone-500 text-sm">Trail Image</span>
            <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-transparent" />
          </div>
        )}
        
        {/* Removed static status badges - showing external links instead */}

        {/* Difficulty Badge */}
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1 rounded-none text-xs font-black uppercase tracking-widest border-2 ${colors.bg} ${colors.text} ${colors.border}`}>
            {trail.difficultyLevel}
          </span>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="text-2xl md:text-3xl font-serif font-bold text-stone-50 mb-1">
            {trail.name}
          </h3>
          <div className="flex items-center gap-2 text-stone-300 text-sm">
            <MapPin size={16} className="text-orange-500" />
            <span>{trail.location}</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="text-center p-3 bg-stone-900/50 rounded-lg border border-stone-700/50">
            <Mountain size={20} className="mx-auto mb-1 text-orange-500" />
            <div className="text-stone-400 text-xs uppercase tracking-wider">Distance</div>
            <div className="text-stone-200 font-semibold">{trail.distance}</div>
          </div>
          <div className="text-center p-3 bg-stone-900/50 rounded-lg border border-stone-700/50">
            <Clock size={20} className="mx-auto mb-1 text-orange-500" />
            <div className="text-stone-400 text-xs uppercase tracking-wider">Time</div>
            <div className="text-stone-200 font-semibold">{trail.time}</div>
          </div>
          <div className="text-center p-3 bg-stone-900/50 rounded-lg border border-stone-700/50">
            <Wrench size={20} className="mx-auto mb-1 text-orange-500" />
            <div className="text-stone-400 text-xs uppercase tracking-wider">Rig</div>
            <div className="text-stone-200 font-semibold text-xs">{trail.rigRequirements?.split('/')[0] ?? '—'}</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-stone-400 mb-5 leading-relaxed">{trail.description}</p>

        {/* Rig Requirements */}
        <div className="mb-5 p-3 bg-stone-900/50 rounded-lg border border-stone-700/50">
          <div className="text-stone-500 text-xs uppercase tracking-wider mb-1">Rig Requirements</div>
          <div className="text-stone-300 text-sm">{trail.rigRequirements}</div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {trail.tags.map((tag) => (
            <span key={tag} className="px-3 py-1 bg-stone-700/50 text-stone-400 rounded-full text-xs border border-stone-600/30">
              {tag}
            </span>
          ))}
        </div>

        {/* Navigation Suite */}
        <div className="grid grid-cols-2 gap-3">
          <a href={trail.mapsUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-center text-neutral-300 text-xs font-bold uppercase border border-neutral-700 transition-colors">
            Google Maps
          </a>
          <a href={trail.onxUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-center text-white text-xs font-bold uppercase transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            </svg>
            <span className="font-medium">Open in onX</span>
          </a>
        </div>
      </div>
    </div>
  );
}
