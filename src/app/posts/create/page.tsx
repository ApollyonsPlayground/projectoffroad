'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Camera, MapPin, Truck } from 'lucide-react'

export default function CreatePostPage() {
  const [formData, setFormData] = useState({
    caption: '',
    vehicle: '',
    mods: '',
    location: '',
    imageUrl: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Post created! (Demo - Supabase disabled)')
  }

  return (
    <div className="min-h-screen bg-[#050705]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#050705] border-b-2 border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-neutral-400 hover:text-white">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-lg font-bold text-white uppercase tracking-wide">Share Your Rig</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="border-2 border-dashed border-neutral-700 rounded-lg p-8 text-center hover:border-muted-gold transition-colors cursor-pointer">
            <Camera className="mx-auto text-neutral-500 mb-4" size={48} />
            <p className="text-neutral-400 mb-2">Click to upload a photo of your rig</p>
            <p className="text-neutral-600 text-sm">PNG, JPG up to 10MB</p>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-bold text-neutral-400 uppercase tracking-wider mb-2">
              Caption
            </label>
            <textarea
              value={formData.caption}
              onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-900 border-2 border-neutral-800 rounded-lg text-white focus:border-muted-gold focus:outline-none"
              rows={3}
              placeholder="Tell us about your build..."
            />
          </div>

          {/* Vehicle */}
          <div>
            <label className="block text-sm font-bold text-neutral-400 uppercase tracking-wider mb-2">
              <Truck className="inline mr-2" size={16} />
              Vehicle
            </label>
            <input
              type="text"
              value={formData.vehicle}
              onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-900 border-2 border-neutral-800 rounded-lg text-white focus:border-muted-gold focus:outline-none"
              placeholder="Jeep Wrangler Rubicon"
            />
          </div>

          {/* Mods */}
          <div>
            <label className="block text-sm font-bold text-neutral-400 uppercase tracking-wider mb-2">
              Modifications
            </label>
            <input
              type="text"
              value={formData.mods}
              onChange={(e) => setFormData({ ...formData, mods: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-900 border-2 border-neutral-800 rounded-lg text-white focus:border-muted-gold focus:outline-none"
              placeholder="3&quot; Lift, 35&quot; tires, front bumper..."
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-bold text-neutral-400 uppercase tracking-wider mb-2">
              <MapPin className="inline mr-2" size={16} />
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-900 border-2 border-neutral-800 rounded-lg text-white focus:border-muted-gold focus:outline-none"
              placeholder="Cajon Pass, CA"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-4 bg-muted-gold hover:bg-moss text-black font-black uppercase tracking-widest transition-colors"
          >
            Post
          </button>
        </form>
      </div>
    </div>
  )
}