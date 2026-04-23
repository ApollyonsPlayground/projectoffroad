'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@supabase/supabase-js'
import { Users, AlertCircle } from 'lucide-react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Club {
  id: string
  name: string
  role?: string
  is_verified?: boolean
}

export default function CreateRunPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [userClubs, setUserClubs] = useState<Club[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingClubs, setLoadingClubs] = useState(true)
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
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchUserClubs()
    }
  }, [user])

  async function fetchUserClubs() {
    if (!user) return
    
    const { data } = await supabase
      .from('club_members')
      .select('*, clubs!inner(id, name, is_verified)')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin', 'leader'])

    setLoadingClubs(false)
    
    if (data && data.length > 0) {
      const clubs = data
        .filter(item => item.clubs)
        .map(item => ({
          id: item.clubs.id,
          name: item.clubs.name,
          role: item.role,
          is_verified: item.clubs.is_verified || false
        }))
      setUserClubs(clubs)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!formData.club_id) {
      alert('Please select a club to host this run')
      return
    }

    setSubmitting(true)
    
    const dateTime = `${formData.date}T${formData.time}:00`
    
    const { error } = await supabase
      .from('runs')
      .insert({
        club_id: formData.club_id,
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

  if (authLoading || loadingClubs) {
    return (
      <div className="min-h-screen bg-[#050705] flex items-center justify-center">
        <div className="text-[#FF8C00]">Loading...</div>
      </div>
    )
  }

  const hasAnyClubs = userClubs.length > 0
  const verifiedClubs = userClubs.filter(club => club.is_verified)
  const hasUnverifiedClub = hasAnyClubs && verifiedClubs.length === 0

  if (hasUnverifiedClub) {
    return (
      <div className="min-h-screen bg-[#050705] flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-[#FF8C00]" />
          </div>
          <h1 className="text-2xl font-black uppercase text-white mb-4">
            Pending Verification
          </h1>
          <p className="text-neutral-400 mb-6">
            Your club is still under review. Only verified clubs can host official runs. Please wait for verification to complete.
          </p>
        </div>
      </div>
    )
  }

  if (!hasAnyClubs) {
    return (
      <div className="min-h-screen bg-[#050705] flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users size={32} className="text-[#FF8C00]" />
          </div>
          <h1 className="text-2xl font-black uppercase text-white mb-4">
            Club Required
          </h1>
          <p className="text-neutral-400 mb-6">
            Only verified clubs can host official runs. You need to be an admin or leader of a club to create a run.
          </p>
          <button
            onClick={() => router.push('/clubs/create')}
            className="px-6 py-3 bg-[#FF8C00] hover:bg-[#FF9D00] text-white font-black uppercase tracking-widest transition"
          >
            Register a Club
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050705]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-black uppercase text-[#FF8C00] mb-6">Create a Run</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Run Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-neutral-900 border-2 border-neutral-800 px-4 py-3 text-white focus:border-[#FF8C00] focus:outline-none transition"
              placeholder="e.g., Mojave Trail Run"
              required
            />
          </div>

          {/* Club - REQUIRED */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
              Hosting Club <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.club_id}
              onChange={(e) => setFormData({ ...formData, club_id: e.target.value })}
              className="w-full bg-neutral-900 border-2 border-neutral-800 px-4 py-3 text-white focus:border-[#FF8C00] focus:outline-none transition"
              required
            >
              <option value="">Select a club...</option>
              {verifiedClubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name} ({club.role})
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-neutral-900 border-2 border-neutral-800 px-4 py-3 text-white focus:border-[#FF8C00] focus:outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Time *</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full bg-neutral-900 border-2 border-neutral-800 px-4 py-3 text-white focus:border-[#FF8C00] focus:outline-none transition"
                required
              />
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Difficulty *</label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
              className="w-full bg-neutral-900 border-2 border-neutral-800 px-4 py-3 text-white focus:border-[#FF8C00] focus:outline-none transition"
            >
              <option>Easy</option>
              <option>Moderate</option>
              <option>Challenging</option>
              <option>Extreme</option>
            </select>
          </div>

          {/* Meetup Location */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Meetup Location *</label>
            <input
              type="text"
              value={formData.meetup_location}
              onChange={(e) => setFormData({ ...formData, meetup_location: e.target.value })}
              className="w-full bg-neutral-900 border-2 border-neutral-800 px-4 py-3 text-white focus:border-[#FF8C00] focus:outline-none transition"
              placeholder="e.g., Chevron station, Hesperia"
              required
            />
          </div>

          {/* Max Participants */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Max Participants</label>
            <input
              type="number"
              value={formData.max_participants}
              onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
              className="w-full bg-neutral-900 border-2 border-neutral-800 px-4 py-3 text-white focus:border-[#FF8C00] focus:outline-none transition"
              min={2}
              max={50}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-neutral-900 border-2 border-neutral-800 px-4 py-3 text-white focus:border-[#FF8C00] focus:outline-none transition"
              rows={3}
              placeholder="Describe the run, trail conditions, what to expect..."
            />
          </div>

          {/* Vehicle Requirements */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Vehicle Requirements</label>
            <input
              type="text"
              value={formData.vehicle_requirements}
              onChange={(e) => setFormData({ ...formData, vehicle_requirements: e.target.value })}
              className="w-full bg-neutral-900 border-2 border-neutral-800 px-4 py-3 text-white focus:border-[#FF8C00] focus:outline-none transition"
              placeholder="e.g., 33 inch tires, winch, front/rear lockers"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-[#FF8C00] hover:bg-[#FF9D00] text-white font-black uppercase tracking-widest transition disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Run'}
          </button>
        </form>
      </div>
    </div>
  )
}