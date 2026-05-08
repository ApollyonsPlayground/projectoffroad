'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar_url: string | null;
  runs_attended: number;
}

export default function LeaderboardPage() {
  const { supabaseClient } = useAuth();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      if (!supabaseClient) {
        setLoading(false);
        return;
      }
      const { data: users } = await supabaseClient
        .from('users')
        .select('id, name, avatar_url')
        .order('created_at', { ascending: false })
        .limit(50);

      if (users) {
        const leadersWithCounts = await Promise.all(
          users.map(async (u, index) => {
            const { count } = await supabaseClient
              .from('run_participants')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', u.id)
              .eq('rsvp_status', 'going');

            return {
              rank: index + 1,
              user_id: u.id,
              name: u.name,
              avatar_url: u.avatar_url,
              runs_attended: count || 0,
            };
          }),
        );

        const sorted = leadersWithCounts.sort((a, b) => b.runs_attended - a.runs_attended);
        const ranked = sorted.map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

        setLeaders(ranked);
      }

      setLoading(false);
    }

    void fetchLeaderboard();
  }, [supabaseClient]);

  function getRankIcon(rank: number) {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">Leaderboard</h1>
        <p className="text-gray-400 mb-8">Top riders by run RSVPs (going)</p>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading…</div>
        ) : leaders.length > 0 ? (
          <div className="space-y-3">
            {leaders.map((entry) => {
              const icon = getRankIcon(entry.rank);
              return (
                <Link
                  key={entry.user_id}
                  href={`/profile/${entry.user_id}/`}
                  className={`flex items-center p-4 rounded-xl border transition-colors ${
                    entry.rank <= 3
                      ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="w-12 text-2xl text-center">
                    {typeof icon === 'string' && icon.startsWith('#') ? (
                      <span className="text-gray-400 font-mono">{icon}</span>
                    ) : (
                      <span>{icon}</span>
                    )}
                  </div>

                  <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-black font-bold text-xl ml-4 overflow-hidden">
                    {entry.name?.charAt(0) || '?'}
                  </div>

                  <div className="flex-1 ml-4 min-w-0">
                    <div className="text-white font-semibold truncate">{entry.name}</div>
                    <div className="text-gray-400 text-sm">{entry.runs_attended} run RSVPs</div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-amber-500">{entry.runs_attended}</div>
                    <div className="text-xs text-gray-500">RSVPs</div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            No users yet. Be the first to join some runs!
          </div>
        )}

        <div className="mt-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-2">How to climb the ranks</h2>
          <ul className="text-gray-400 space-y-2 text-sm">
            <li>• RSVP &quot;going&quot; on runs you attend</li>
            <li>• Host or join club runs</li>
          </ul>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
