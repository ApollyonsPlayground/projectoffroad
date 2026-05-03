'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { ClubVerificationCallout } from '@/components/ClubVerificationCallout'
import { supabase } from '@/lib/db/supabase'

export default function CreateClubPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    website: '',
    instagram: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!supabase) {
      alert('App configuration error: Supabase client unavailable.')
      return
    }

    setSubmitting(true)
    
    // Generate slug from name
    const slug = formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    
    const { error } = await supabase
      .from('clubs')
      .insert({
        name: formData.name,
        slug,
        description: formData.description,
        location: formData.location,
        website: formData.website,
        instagram: formData.instagram,
        owner_id: user.id
      })

    setSubmitting(false)
    
    if (!error) {
      router.push('/clubs')
    } else {
      alert('Error creating club: ' + error.message)
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
        <h1 className="text-2xl font-bold text-white mb-6">Create a Club</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Club Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Club Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="e.g., Desert Warriors Offroad Club"
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Location *</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="e.g., Victorville, CA"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white h-32"
              placeholder="Tell people about your club..."
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="https://yourclub.com"
            />
          </div>

          {/* Instagram */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Instagram</label>
            <input
              type="text"
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="yourhandle (without @)"
            />
          </div>

          <ClubVerificationCallout variant="banner" />

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#FF8C00] hover:bg-[#FF9D00] text-white font-bold rounded-lg transition disabled:opacity-50 min-h-[48px] touch-manipulation"
          >
            {submitting ? 'Creating...' : 'Create Club'}
          </button>

          <p className="text-gray-500 text-sm text-center">
            New clubs start unverified until the organizer confirms your listing (see above).
          </p>
        </form>
      </div>
    </div>
  )
}
