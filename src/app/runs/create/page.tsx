'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Club {
  id: string
  name: string
}

export default function CreateRunPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [clubs, setClubs] = useState<Club[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    club_id: '',
    date: '',
    time: '10:00',
    meetup_location: '',
    difficulty: 'Moderate',
    max_participants: 10,
    vehicle_requirements: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    fetchClubs()
  }, [user, authLoading])

  async function fetchClubs() {
    const { data } = await supabase
      .from('clubs')
      .select('id, name')
      .order('name')
    
    if (data) setClubs(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    
    const dateTime = `${formData.date}T${formData.time}:00`
    
    const { error } = await supabase
      .from('runs')
      .insert({
        club_id: formData.club_id || null,
        title: formData.title,
        description: formData.description,
        date: dateTime,
        meetup_location: formData.meetup_location,
        difficulty: formData.difficulty,
        max_participants: formData.max_participants,
        vehicle_requirements: formData.vehicle_requirements,
        status: 'upcoming'
      })

    setSubmitting(false)
    
    if (!error) {
      router.push('/runs')
    } else {
      alert('Error creating run: ' + error.message)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-amber-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Create a Run</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Run Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="e.g., Mojave Trail Run"
              required
            />
          </div>

          {/* Club */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Club (optional)</label>
            <select
              value={formData.club_id}
              onChange={(e) => setFormData({ ...formData, club_id: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            >
              <option value="">Independent (no club)</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>{club.name}</option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Time *</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                required
              />
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Difficulty *</label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            >
              <option>Easy</option>
              <option>Moderate</option>
              <option>Challenging</option>
              <option>Extreme</option>
            </select>
          </div>

          {/* Meetup Location */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Meetup Location *</label>
            <input
              type="text"
              value={formData.meetup_location}
              onChange={(e) => setFormData({ ...formData, meetup_location: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="e.g., Chevron station, Hesperia"
              required
            />
          </div>

          {/* Max Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Max Participants</label>
            <input
              type="number"
              value={formData.max_participants}
              onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              min={2}
              max={50}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white h-32"
              placeholder="Describe the run, trail conditions, what to expect..."
            />
          </div>

          {/* Vehicle Requirements */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Vehicle Requirements</label>
            <input
              type="text"
              value={formData.vehicle_requirements}
              onChange={(e) => setFormData({ ...formData, vehicle_requirements: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="e.g., 33 inch tires, winch, front/rear lockers"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Run'}
          </button>
        </form>
      </div>
    </div>
  )
}
