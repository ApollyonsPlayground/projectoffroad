'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/db/supabase'

interface Club {
  id: string
  name: string
  slug: string
  logo: string
  description: string
  location: string
  website: string
  instagram: string
  verified: boolean
  premium: boolean
  owner_id: string
}

interface Run {
  id: string
  title: string
  date: string
  difficulty: string
}

interface Member {
  id: string
  user_id: string
  role: string
  user?: { name: string; avatar_url: string }
}

export default function ClubDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [club, setClub] = useState<Club | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [isMember, setIsMember] = useState(false)

  useEffect(() => {
    if (id) {
      fetchClub()
      fetchRuns()
      fetchMembers()
    }
  }, [id])

  useEffect(() => {
    if (user && members.length > 0) {
      setIsMember(members.some(m => m.user_id === user.id))
    }
  }, [user, members])

  async function fetchClub() {
    if (!supabase) {
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', id)
      .single()
    
    if (data) setClub(data)
    setLoading(false)
  }

  async function fetchRuns() {
    const { data } = await supabase
      .from('runs')
      .select('id, title, date, difficulty')
      .eq('club_id', id)
      .eq('status', 'upcoming')
      .order('date', { ascending: true })
      .limit(5)
    
    if (data) setRuns(data)
  }

  async function fetchMembers() {
    if (!supabase) return
    const { data } = await supabase
      .from('club_members')
      .select('*, user:users(id, name, avatar_url)')
      .eq('club_id', id)
      .order('role', { ascending: true })
    
    if (data) setMembers(data)
  }

  async function joinClub() {
    if (!user) {
      router.push('/login')
      return
    }
    
    setJoining(true)
    if (!supabase) {
      setJoining(false)
      return
    }
    const { error } = await supabase
      .from('club_members')
      .insert({ club_id: id, user_id: user.id, role: 'member' })
    
    setJoining(false)
    if (!error) {
      setIsMember(true)
      fetchMembers()
    }
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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-amber-500">Loading...</div>
      </div>
    )
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Club not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Club Header */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex items-start space-x-4">
            <div className="w-20 h-20 bg-gray-700 rounded-xl flex items-center justify-center text-4xl">
              {club.logo ? (
                <img src={club.logo} alt={club.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                '🏢'
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-white">{club.name}</h1>
                {club.verified && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-sm rounded">
                    ✓ Verified
                  </span>
                )}
                {club.premium && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-sm rounded">
                    ⭐ Premium
                  </span>
                )}
              </div>
              <p className="text-gray-400 mt-1">{club.location}</p>
              
              <div className="flex space-x-4 mt-4">
                {club.website && (
                  <a href={club.website} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline text-sm">
                    🌐 Website
                  </a>
                )}
                {club.instagram && (
                  <a href={`https://instagram.com/${club.instagram}`} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline text-sm">
                    📸 @{club.instagram}
                  </a>
                )}
              </div>
            </div>
          </div>

          {club.description && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-300">{club.description}</p>
            </div>
          )}

          <button
            onClick={joinClub}
            disabled={joining || isMember}
            className="mt-6 w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition disabled:opacity-50 disabled:bg-green-600"
          >
            {joining ? 'Joining...' : isMember ? '✓ Member' : 'Join Club'}
          </button>
        </div>

        {/* Upcoming Runs */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Upcoming Runs</h2>
          </div>
          
          <div className="p-4">
            {runs.length > 0 ? (
              <div className="space-y-3">
                {runs.map((run) => (
                  <a key={run.id} href={`/runs/${run.id}`} className="block p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">{run.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getDifficultyColor(run.difficulty)}`}>
                        {run.difficulty}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {new Date(run.date).toLocaleDateString()}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No upcoming runs scheduled
              </div>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Members ({members.length})</h2>
          </div>
          
          <div className="p-4">
            {members.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center space-x-2 p-2 bg-gray-700 rounded-lg">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-black font-bold">
                      {member.user?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm truncate">{member.user?.name || 'Unknown'}</div>
                      <div className="text-gray-500 text-xs capitalize">{member.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No members yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
