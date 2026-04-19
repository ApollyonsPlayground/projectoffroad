'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Vehicle {
  id: string
  year: number
  make: string
  model: string
  modifications: string
  is_primary: boolean
}

export default function ProfilePage() {
  const { user, profile, loading } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    experience_level: 'Beginner',
    location: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  })

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login'
    }
    
    if (user && profile) {
      setFormData({
        name: profile.name || '',
        bio: profile.bio || '',
        experience_level: profile.experience_level || 'Beginner',
        location: profile.location || '',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || ''
      })
      fetchVehicles()
    }
  }, [user, profile, loading])

  async function fetchVehicles() {
    if (!user) return
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
    
    if (data) setVehicles(data)
  }

  async function handleSave() {
    if (!user) return
    
    const { error } = await supabase
      .from('users')
      .update(formData)
      .eq('id', user.id)

    if (!error) {
      setEditing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-amber-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Your Profile</h1>

        {/* Profile Info */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Profile Info</h2>
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-sm font-medium"
            >
              {editing ? 'Save' : 'Edit'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              ) : (
                <div className="text-white">{profile?.name}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Experience Level</label>
              {editing ? (
                <select
                  value={formData.experience_level}
                  onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Expert</option>
                </select>
              ) : (
                <div className="text-white">{profile?.experience_level}</div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">Bio</label>
              {editing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-24"
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <div className="text-gray-300">{profile?.bio || 'No bio yet'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Moreno Valley, CA"
                />
              ) : (
                <div className="text-white">{profile?.location || 'Not set'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Emergency Contact</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white mb-2"
                  placeholder="Contact name"
                />
              ) : (
                <div className="text-white">{profile?.emergency_contact_name || 'Not set'}</div>
              )}
            </div>
          </div>
        </div>

        {/* Vehicles */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Your Vehicles</h2>
            <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-sm font-medium">
              Add Vehicle
            </button>
          </div>

          {vehicles.length > 0 ? (
            <div className="space-y-4">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-white">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </div>
                      <div className="text-sm text-gray-400">
                        {vehicle.modifications || 'No modifications listed'}
                      </div>
                    </div>
                    {vehicle.is_primary && (
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs rounded">
                        Primary
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No vehicles added yet. Add your rig to join runs!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
