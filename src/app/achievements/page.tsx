'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/db/supabase'

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  earned_at?: string
}

const DEFAULT_ACHIEVEMENTS = [
  { id: '1', name: 'First Run', description: 'Attended your first run', icon: '🏁' },
  { id: '2', name: 'Trail Blazer', description: 'Completed 10 trails', icon: '🥾' },
  { id: '3', name: 'Social Butterfly', description: 'Added 10 friends', icon: '🦋' },
  { id: '4', name: 'Club Founder', description: 'Created a club', icon: '🏠' },
  { id: '5', name: 'Offroad Veteran', description: 'Attended 50 runs', icon: '🎖️' },
  { id: '6', name: 'Wheelin Master', description: 'Completed an extreme run', icon: '🚙' },
]

export default function AchievementsPage() {
  const { user, loading: authLoading } = useAuth()
  const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS)
  const [userAchievements, setUserAchievements] = useState<string[]>([])

  useEffect(() => {
    if (user) {
      fetchUserAchievements()
    }
  }, [user])

  async function fetchUserAchievements() {
    if (!supabase) return
    const { data } = await supabase
      .from('user_achievements')
      .select('achievement_id, earned_at')
      .eq('user_id', user?.id)
    
    if (data) {
      const earned = data.map(d => d.achievement_id)
      setUserAchievements(earned)
      
      // Add earned_at dates to achievements
      const achievementsWithDates = DEFAULT_ACHIEVEMENTS.map(a => {
        const userAchievement = data.find(ua => ua.achievement_id === a.id)
        return {
          ...a,
          earned_at: userAchievement?.earned_at
        }
      })
      setAchievements(achievementsWithDates)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-amber-500">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Sign in to view achievements</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">Achievements</h1>
        <p className="text-gray-400 mb-8">Earn badges by participating in the community</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {achievements.map((achievement) => {
            const earned = userAchievements.includes(achievement.id)
            
            return (
              <div
                key={achievement.id}
                className={`p-6 rounded-xl border transition ${
                  earned
                    ? 'bg-amber-500/10 border-amber-500/50'
                    : 'bg-gray-800 border-gray-700 opacity-60'
                }`}
              >
                <div className="text-4xl mb-3">{achievement.icon}</div>
                <div className={`font-semibold ${earned ? 'text-amber-500' : 'text-gray-400'}`}>
                  {achievement.name}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {achievement.description}
                </div>
                {earned && achievement.earned_at && (
                  <div className="text-xs text-amber-500/70 mt-2">
                    Earned {new Date(achievement.earned_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-2">How to Earn More</h2>
          <ul className="text-gray-400 space-y-2">
            <li>• Attend runs to earn "First Run", "Offroad Veteran"</li>
            <li>• Complete trails to earn "Trail Blazer"</li>
            <li>• Make friends to earn "Social Butterfly"</li>
            <li>• Create a club to earn "Club Founder"</li>
            <li>• Tackle extreme runs to earn "Wheelin Master"</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
