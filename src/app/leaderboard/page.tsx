'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/db/supabase'

interface LeaderboardEntry {
  rank: number
  user_id: string
  name: string
  avatar_url: string
  runs_attended: number
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  async function fetchLeaderboard() {
    if (!supabase) {
      setLoading(false)
      return
    }
    // Get all users and count their run participations
    const { data: users } = await supabase
      .from('users')
      .select('id, name, avatar_url')
      .order('created_at', { ascending: false })
      .limit(50)

    if (users) {
      // For each user, count run_participants
      const leadersWithCounts = await Promise.all(
        users.map(async (user, index) => {
          const { count } = await supabase
            .from('run_participants')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('rsvp_status', 'going')
          
          return {
            rank: index + 1,
            user_id: user.id,
            name: user.name,
            avatar_url: user.avatar_url,
            runs_attended: count || 0
          }
        })
      )

      // Sort by runs attended
      const sorted = leadersWithCounts.sort((a, b) => b.runs_attended - a.runs_attended)
      
      // Re-assign ranks
      const ranked = sorted.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }))

      setLeaders(ranked)
    }
    
    setLoading(false)
  }

  function getRankIcon(rank: number) {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">Leaderboard</h1>
        <p className="text-gray-400 mb-8">Top offroaders in the community</p>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : leaders.length > 0 ? (
          <div className="space-y-3">
            {leaders.map((entry) => (
              <div
                key={entry.user_id}
                className={`flex items-center p-4 rounded-xl border ${
                  entry.rank <= 3
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-gray-800 border-gray-700'
                }`}
              >
                <div className="w-12 text-2xl text-center">
                  {typeof getRankIcon(entry.rank) === 'string' && getRankIcon(entry.rank).startsWith('#') ? (
                    <span className="text-gray-400 font-mono">{getRankIcon(entry.rank)}</span>
                  ) : (
                    <span>{getRankIcon(entry.rank)}</span>
                  )}
                </div>
                
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-black font-bold text-xl ml-4">
                  {entry.name?.charAt(0) || '?'}
                </div>
                
                <div className="flex-1 ml-4">
                  <div className="text-white font-semibold">{entry.name}</div>
                  <div className="text-gray-400 text-sm">
                    {entry.runs_attended} runs attended
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-amber-500">{entry.runs_attended}</div>
                  <div className="text-xs text-gray-500">runs</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            No users yet. Be the first to join some runs!
          </div>
        )}

        <div className="mt-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-2">How to Climb the Ranks</h2>
          <ul className="text-gray-400 space-y-2">
            <li>• Join runs to increase your count</li>
            <li>• The more runs you attend, the higher you rank</li>
            <li>• Attending extreme runs shows dedication</li>
            <li>• Create a club and host runs to become a community leader</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
