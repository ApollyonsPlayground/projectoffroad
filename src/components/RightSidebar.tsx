'use client';

import { useState, useEffect } from 'react';
import { Users, Clock, Plus } from 'lucide-react';
import Link from 'next/link';
import FeaturedRigs from './FeaturedRigs';

interface Run {
  id: string;
  title: string;
  date: string;
  difficulty: string;
  participants_count?: number;
}

interface Club {
  id: string;
  name: string;
  member_count?: number;
}

export default function RightSidebar() {
  const [activeRuns, setActiveRuns] = useState<Run[]>([]);
  const [newClubs, setNewClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const runsRes = await fetch('/api/runs?status=upcoming&limit=3');
        const runsData = await runsRes.json();
        setActiveRuns(Array.isArray(runsData) ? runsData : []);

        const clubsRes = await fetch('/api/clubs?limit=3');
        const clubsData = await clubsRes.json();
        setNewClubs(Array.isArray(clubsData) ? clubsData : []);
      } catch (err) {
        console.error('Error fetching sidebar data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const hasRuns = activeRuns.length > 0;
  const hasClubs = newClubs.length > 0;

  return (
    <aside className="w-80 p-4 space-y-4">
      {/* Featured Rigs - Instagram style gallery */}
      <FeaturedRigs />

      {/* Active Runs */}
      <div className="bg-neutral-900 border-2 border-neutral-800 p-4">
        <h3 className="flex items-center gap-2 font-black uppercase tracking-wider text-muted-gold mb-4">
          <Clock size={18} />
          Active Runs
        </h3>
        
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1,2].map(i => <div key={i} className="h-12 bg-neutral-800"></div>)}
          </div>
        ) : hasRuns ? (
          <ul className="space-y-3">
            {activeRuns.map((run) => (
              <li key={run.id} className="border-b border-neutral-800 pb-2">
                <Link href={`/runs/${run.id}`} className="text-neutral-300 font-bold text-sm hover:text-muted-gold block">
                  {run.title}
                </Link>
                <div className="text-xs text-neutral-500 flex gap-2 mt-1">
                  <span>{run.date ? new Date(run.date).toLocaleDateString() : 'TBD'}</span>
                  <span>•</span>
                  <span className="text-muted-gold">{run.difficulty}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-2 border-dashed border-neutral-700 p-4 text-center">
            <p className="text-neutral-500 text-sm font-bold uppercase tracking-wide mb-3">
              No active runs right now
            </p>
            <Link
              href="/runs/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-muted-gold hover:bg-moss text-black text-xs font-black uppercase transition-colors"
            >
              <Plus size={14} />
              New Run
            </Link>
          </div>
        )}
      </div>

      {/* Clubs */}
      <div className="bg-neutral-900 border-2 border-neutral-800 p-4">
        <h3 className="flex items-center gap-2 font-black uppercase tracking-wider text-muted-gold mb-4">
          <Users size={18} />
          Clubs
        </h3>
        
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1,2].map(i => <div key={i} className="h-10 bg-neutral-800"></div>)}
          </div>
        ) : hasClubs ? (
          <ul className="space-y-3">
            {newClubs.map((club) => (
              <li key={club.id} className="flex justify-between items-center border-b border-neutral-800 pb-2">
                <Link href={`/clubs/${club.id}`} className="text-neutral-300 font-bold text-sm hover:text-muted-gold">
                  {club.name}
                </Link>
                {club.member_count !== undefined && (
                  <span className="text-xs text-neutral-500">{club.member_count} members</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-2 border-dashed border-neutral-700 p-4 text-center">
            <p className="text-neutral-500 text-sm font-bold uppercase tracking-wide mb-3">
              No clubs yet
            </p>
            <Link
              href="/clubs/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-muted-gold hover:bg-moss text-black text-xs font-black uppercase transition-colors"
            >
              <Plus size={14} />
              Create Club
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}