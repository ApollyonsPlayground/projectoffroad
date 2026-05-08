'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { ClubVerificationCallout } from '@/components/ClubVerificationCallout'
import { supabase } from '@/lib/db/supabase'

function normalizeInstagram(input: string): string {
  const t = input.trim().replace(/^@/, '')
  if (!t) return ''
  const fromUrl = t.match(/instagram\.com\/([^/?#]+)/i)
  if (fromUrl) return fromUrl[1]
  return t
}

function normalizeWebsite(input: string): string {
  return input.trim()
}

export default function CreateClubPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [presenceError, setPresenceError] = useState('')
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

    const website = normalizeWebsite(formData.website)
    const instagram = normalizeInstagram(formData.instagram)
    if (!website && !instagram) {
      setPresenceError('Add an Instagram handle or a website URL so people can find your club (Instagram alone is fine).')
      return
    }
    setPresenceError('')

    setSubmitting(true)
    
    // Generate slug from name
    const slug = formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    
    const { data: created, error } = await supabase
      .from('clubs')
      .insert({
        name: formData.name,
        slug,
        description: formData.description,
        location: formData.location,
        website: website || null,
        instagram: instagram || null,
        owner_id: user.id
      })
      .select('id')
      .single()

    setSubmitting(false)
    
    if (!error && created?.id) {
      router.push(`/clubs/${created.id}`)
    } else if (!error) {
      router.push('/clubs')
    } else {
      alert('Error creating club: ' + error.message)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Create a Club</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Club Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Club Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
              placeholder="e.g., Desert Warriors Offroad Club"
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Location *</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
              placeholder="e.g., Victorville, CA"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground h-32"
              placeholder="Tell people about your club..."
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Web presence</span> — add{' '}
              <strong className="text-primary">Instagram</strong>, a <strong className="text-primary">website</strong>, or
              both. Instagram alone is enough; a website is not required.
            </p>

            {/* Instagram (sufficient on its own) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Instagram</label>
              <input
                type="text"
                value={formData.instagram}
                onChange={(e) => {
                  setPresenceError('')
                  setFormData({ ...formData, instagram: e.target.value })
                }}
                className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                placeholder="@handle, handle, or full instagram.com/… URL"
              />
            </div>

            {/* Website (optional) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Website (optional)</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => {
                  setPresenceError('')
                  setFormData({ ...formData, website: e.target.value })
                }}
                className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
                placeholder="https://yourclub.com (leave blank if you only use Instagram)"
              />
            </div>

            {presenceError ? (
              <p className="text-sm text-red-400" role="alert">
                {presenceError}
              </p>
            ) : null}
          </div>

          <ClubVerificationCallout variant="banner" />

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition disabled:opacity-50 min-h-[48px] touch-manipulation"
          >
            {submitting ? 'Creating...' : 'Create Club'}
          </button>

          <p className="text-muted-foreground text-sm text-center">
            New clubs start unverified until the organizer confirms your listing (see above).
          </p>
        </form>
      </div>
    </div>
  )
}
