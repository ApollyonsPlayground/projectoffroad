'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/db/supabase'

interface Run {
  id: string
  title: string
  date: string
  difficulty: string
  club?: { name: string }
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const [runs, setRuns] = useState<Run[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login'
    }
    
    if (user) {
      fetchRuns()
    }
  }, [user, loading])

  async function fetchRuns() {
    if (!supabase) {
      setFetching(false)
      return
    }
    const { data } = await supabase
      .from('runs')
      .select('*, club:clubs(name)')
      .eq('status', 'upcoming')
      .order('date', { ascending: true })
      .limit(5)
    
    if (data) setRuns(data)
    setFetching(false)
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-amber-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {(profile?.name as string | undefined) || 'Offroader'}!
          </h1>
          <p className="text-gray-400 mt-2">
            Ready for your next adventure?
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="text-3xl font-bold text-amber-500">0</div>
            <div className="text-gray-400 mt-1">Runs Attended</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="text-3xl font-bold text-amber-500">0</div>
            <div className="text-gray-400 mt-1">Trails Completed</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="text-3xl font-bold text-amber-500">0</div>
            <div className="text-gray-400 mt-1">Friends</div>
          </div>
        </div>

        {/* Upcoming Runs */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Upcoming Runs</h2>
          </div>
          
          <div className="p-6">
            {runs.length > 0 ? (
              <div className="space-y-4">
                {runs.map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-white">{run.title}</div>
                      <div className="text-sm text-gray-400">
                        {new Date(run.date).toLocaleDateString()} • {run.club?.name} • {run.difficulty}
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-sm font-medium">
                      Join
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No upcoming runs. Check back later or create one with your club!
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <a href="/clubs" className="block p-6 bg-gray-800 rounded-xl border border-gray-700 hover:border-amber-500 transition">
            <div className="text-xl font-semibold text-white mb-2">Find a Club</div>
            <div className="text-gray-400">Join a local offroad club to get in on runs</div>
          </a>
          <a href="/profile" className="block p-6 bg-gray-800 rounded-xl border border-gray-700 hover:border-amber-500 transition">
            <div className="text-xl font-semibold text-white mb-2">Complete Profile</div>
            <div className="text-gray-400">Add your vehicle info to join runs</div>
          </a>
        </div>
      </div>
    </div>
  )
}
