'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Club {
  id: string
  name: string
  slug: string
  logo: string
  description: string
  location: string
  verified: boolean
  premium: boolean
}

export default function ClubsPage() {
  const { user, loading } = useAuth()
  const [clubs, setClubs] = useState<Club[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchClubs()
  }, [])

  async function fetchClubs() {
    const { data } = await supabase
      .from('clubs')
      .select('*')
      .order('verified', { ascending: false })
      .order('premium', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (data) setClubs(data)
  }

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(search.toLowerCase()) ||
    club.location?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Clubs</h1>
          {user && (
            <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg font-medium">
              Create Club
            </button>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search clubs by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        {/* Clubs Grid */}
        {filteredClubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map((club) => (
              <div key={club.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-amber-500 transition">
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                      {club.logo ? (
                        <img src={club.logo} alt={club.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        '🏢'
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-white">{club.name}</h3>
                        {club.verified && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                            ✓ Verified
                          </span>
                        )}
                        {club.premium && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-xs rounded">
                            ⭐ Premium
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{club.location}</p>
                    </div>
                  </div>

                  <p className="text-gray-400 text-sm mt-4 line-clamp-2">
                    {club.description || 'No description'}
                  </p>
                </div>

                <div className="px-6 py-4 bg-gray-700/50 border-t border-gray-700">
                  <button className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition">
                    View Club
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            {search ? 'No clubs found matching your search.' : 'No clubs yet. Be the first to create one!'}
          </div>
        )}
      </div>
    </div>
  )
}
