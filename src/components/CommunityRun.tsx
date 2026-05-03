'use client';

import { useState, useEffect } from 'react';
import { MapPin, Calendar, Users, Check, Instagram } from 'lucide-react';

interface Run {
  id: string;
  title: string;
  date: string;
  meetupPoint: {
    name: string;
    coordinates: string;
    mapsUrl: string;
  };
  trail: string;
  description: string;
  difficulty: string;
  maxRigs: number;
  joinedCount: number;
  organizer: {
    name: string;
    instagram: string;
  };
}

interface CommunityRunCardProps {
  run: Run;
}

const difficultyColors: Record<string, string> = {
  'Beginner': 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40',
  'Moderate': 'bg-yellow-600/20 text-yellow-400 border-yellow-600/40',
  'Advanced': 'bg-orange-600/20 text-orange-400 border-orange-600/40',
  'Extreme': 'bg-red-600/20 text-red-400 border-red-600/40',
};

export default function CommunityRunCard({ run }: CommunityRunCardProps) {
  const [isJoined, setIsJoined] = useState(false);
  const [localCount, setLocalCount] = useState(run.joinedCount);

  useEffect(() => {
    // Check localStorage on mount
    const joinedRuns = JSON.parse(localStorage.getItem('joinedRuns') || '[]');
    setIsJoined(joinedRuns.includes(run.id));
  }, [run.id]);

  const handleJoinRun = () => {
    const joinedRuns = JSON.parse(localStorage.getItem('joinedRuns') || '[]');
    
    if (isJoined) {
      // Unjoin
      const updated = joinedRuns.filter((id: string) => id !== run.id);
      localStorage.setItem('joinedRuns', JSON.stringify(updated));
      setIsJoined(false);
      setLocalCount(prev => prev - 1);
    } else {
      // Join
      joinedRuns.push(run.id);
      localStorage.setItem('joinedRuns', JSON.stringify(joinedRuns));
      setIsJoined(true);
      setLocalCount(prev => prev + 1);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
  };

  const dateInfo = formatDate(run.date);
  const isFull = localCount >= run.maxRigs;

  return (
    <div className="bg-stone-800/50 backdrop-blur-sm rounded-xl border border-stone-700 overflow-hidden hover:border-orange-600/50 transition-all">
      {/* Header with Date Badge */}
      <div className="relative h-48 bg-stone-900">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80)',
          }}
        >
          <div className="absolute inset-0 bg-stone-900/60"></div>
        </div>
        
        {/* Date Badge */}
        <div className="absolute top-4 left-4 bg-stone-900/90 backdrop-blur rounded-lg p-3 text-center border border-stone-700">
          <div className="text-stone-400 text-xs uppercase font-semibold">{dateInfo.month}</div>
          <div className="text-2xl font-bold text-stone-50">{dateInfo.date}</div>
          <div className="text-stone-400 text-xs">{dateInfo.day}</div>
        </div>

        {/* Difficulty Badge */}
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${difficultyColors[run.difficulty]}`}>
            {run.difficulty}
          </span>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-stone-900 to-transparent">
          <h3 className="text-xl font-bold text-stone-50">{run.title}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Time & Meetup */}
        <div className="flex items-center gap-2 text-stone-400 text-sm mb-3">
          <Calendar size={16} className="text-orange-500" />
          <span>{dateInfo.time}</span>
        </div>

        <div className="flex items-start gap-2 text-stone-400 text-sm mb-4">
          <MapPin size={16} className="text-orange-500 mt-0.5" />
          <div>
            <span className="text-stone-300">Meet at:</span>{' '}
            <a 
              href={run.meetupPoint.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300 underline"
            >
              {run.meetupPoint.name}
            </a>
          </div>
        </div>

        {/* Description */}
        <p className="text-stone-400 text-sm mb-4 line-clamp-3">
          {run.description}
        </p>

        {/* Organizer */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <span className="text-stone-500">Organized by:</span>
          <a 
            href={`https://instagram.com/${run.organizer.instagram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-orange-400 hover:text-orange-300"
          >
            <Instagram size={14} />
            {run.organizer.instagram}
          </a>
        </div>

        {/* Rigs Counter */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-stone-400 text-sm">
            <Users size={16} />
            <span>
              <span className="text-stone-300 font-semibold">{localCount}</span>
              {' / '}
              {run.maxRigs} rigs joined
            </span>
          </div>
          
          {isFull && !isJoined && (
            <span className="text-red-400 text-xs font-semibold">FULL</span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-stone-700 rounded-full h-2 mb-4">
          <div 
            className={`h-2 rounded-full transition-all ${isJoined ? 'bg-orange-600' : 'bg-emerald-600'}`}
            style={{ width: `${Math.min((localCount / run.maxRigs) * 100, 100)}%` }}
          ></div>
        </div>

        {/* Join Button */}
        <button
          onClick={handleJoinRun}
          disabled={isFull && !isJoined}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
            isJoined
              ? 'bg-emerald-600 text-emerald-50 border border-emerald-500 hover:bg-emerald-700 badge-success'
              : isFull
              ? 'bg-stone-700 text-stone-500 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-700 text-stone-50 shadow-lg shadow-orange-600/20 btn-primary'
          }`}
        >
          {isJoined ? (
            <span className="flex items-center justify-center gap-2">
              <Check size={18} />
              REGISTERED
            </span>
          ) : isFull ? (
            'RUN IS FULL'
          ) : (
            'JOIN RUN'
          )}
        </button>
      </div>
    </div>
  );
}
