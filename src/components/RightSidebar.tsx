'use client';

import { TrendingUp, MapPin, Users, Clock } from 'lucide-react';

// Sample data placeholders
const trendingTrails = [
  { id: '1', name: 'Cuyama Trail', difficulty: 'Advanced' },
  { id: '2', name: 'Holcomb Valley', difficulty: 'Moderate' },
  { id: '3', name: 'Joshua Tree Loop', difficulty: 'Beginner' },
];

const activeRuns = [
  { id: '1', title: 'Big Bear Run', participants: 12, time: 'Today 9AM' },
  { id: '2', title: 'Desert Night Run', participants: 8, time: 'Tomorrow 7PM' },
];

const newClubs = [
  { id: '1', name: 'IE Offroaders', members: 156 },
  { id: '2', name: 'Desert Dawgs', members: 89 },
];

export default function RightSidebar() {
  return (
    <aside className="w-80 p-4 space-y-4">
      {/* Trending Trails */}
      <div className="bg-neutral-900 border-2 border-neutral-800 p-4">
        <h3 className="flex items-center gap-2 font-black uppercase tracking-wider text-orange-500 mb-4">
          <TrendingUp size={18} />
          Trending Trails
        </h3>
        <ul className="space-y-3">
          {trendingTrails.map((trail) => (
            <li key={trail.id} className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-neutral-300 font-bold text-sm">{trail.name}</span>
              <span className="text-xs text-neutral-500 uppercase">{trail.difficulty}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Active Runs */}
      <div className="bg-neutral-900 border-2 border-neutral-800 p-4">
        <h3 className="flex items-center gap-2 font-black uppercase tracking-wider text-orange-500 mb-4">
          <Clock size={18} />
          Active Runs
        </h3>
        <ul className="space-y-3">
          {activeRuns.map((run) => (
            <li key={run.id} className="border-b border-neutral-800 pb-2">
              <div className="text-neutral-300 font-bold text-sm">{run.title}</div>
              <div className="text-xs text-neutral-500 flex gap-2">
                <span>{run.participants} going</span>
                <span>•</span>
                <span>{run.time}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* New Clubs */}
      <div className="bg-neutral-900 border-2 border-neutral-800 p-4">
        <h3 className="flex items-center gap-2 font-black uppercase tracking-wider text-orange-500 mb-4">
          <Users size={18} />
          New Clubs
        </h3>
        <ul className="space-y-3">
          {newClubs.map((club) => (
            <li key={club.id} className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <span className="text-neutral-300 font-bold text-sm">{club.name}</span>
              <span className="text-xs text-neutral-500">{club.members} members</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}