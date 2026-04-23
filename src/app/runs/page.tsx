'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Run {
  id: string
  title: string
  description: string
  date: string
  difficulty: string
  max_participants: number
  meetup_location: string
  club?: { name: string; logo: string }
  participants?: number
}

export default function RunsPage() {
  const { user, loading } = useAuth()
  const [runs, setRuns] = useState<Run[]>([])
  const [filter, setFilter] = useState('upcoming')

  useEffect(() => {
    fetchRuns()
  }, [filter])

  async function fetchRuns() {
    const { data } = await supabase
      .from('runs')
      .select('*, club:clubs(name, logo)')
      .eq('status', filter)
      .order('date', { ascending: true })
    
    if (data) setRuns(data)
  }

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'Easy': return 'bg-green-500/20 text-green-400'
      case 'Moderate': return 'bg-yellow-500/20 text-yellow-400'
      case 'Challenging': return 'bg-orange-500/20 text-orange-400'
      case 'Extreme': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Runs</h1>
          {user && (
            <button className="px-4 py-2 bg-[#FF8C00] hover:bg-[#FF9D00] text-white rounded-lg font-bold">
              Create Run
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex space-x-2 mb-6">
          {['upcoming', 'active', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                filter === status
                  ? 'bg-[#FF8C00] text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Runs List */}
        {runs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {runs.map((run) => (
              <div key={run.id} className="bg-neutral-800 rounded-none border-2 border-neutral-700 hover:border-orange-500 transition">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-white uppercase tracking-wide">{run.title}</h3>
                    <span className={`px-2 py-1 rounded-none text-xs font-black uppercase ${getDifficultyColor(run.difficulty)}`}>
                      {run.difficulty}
                    </span>
                  </div>
                  
                  <p className="text-neutral-400 text-sm mb-4 line-clamp-2">
                    {run.description || 'No description'}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-neutral-400">
                      <span className="mr-2">📅</span>
                      {new Date(run.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-neutral-400">
                      <span className="mr-2">📍</span>
                      {run.meetup_location || 'TBD'}
                    </div>
                    <div className="flex items-center text-neutral-400">
                      <span className="mr-2">🏠</span>
                      {run.club?.name || 'Independent'}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-neutral-900/50 border-t-2 border-neutral-700">
                  <Link href={`/runs/${run.id}`} className="w-full py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold uppercase tracking-widest transition text-center block">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-neutral-700 p-12 text-center">
            <p className="text-neutral-500 text-lg font-black uppercase tracking-widest mb-4">
              No {filter} runs right now
            </p>
            <p className="text-neutral-600 text-sm mb-6">Be the first to hit the dirt.</p>
            {user && (
              <Link href="/runs/create" className="inline-block px-6 py-3 bg-[#FF8C00] hover:bg-[#FF9D00] text-white text-sm font-black uppercase tracking-widest transition">
                + New Run
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
