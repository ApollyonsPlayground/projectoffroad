'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LeftNav from '@/components/LeftNav';
import { Camera, MapPin, Truck, Plus, X } from 'lucide-react';

export default function CreatePostPage() {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [mods, setMods] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // In production: would upload to Supabase and create post record
    // For now, simulate posting
    setTimeout(() => {
      setLoading(false);
      router.push('/');
    }, 1000);
  };

  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#050705]">
      <LeftNav isOpen={navOpen} onClose={() => setNavOpen(false)} />
      
      <main className="flex-1 max-w-2xl mx-auto w-full border-x-2 border-neutral-800">
        <div className="sticky top-0 z-50 bg-moss/90 backdrop-blur-sm border-b-2 border-muted-gold px-4 py-3">
          <h1 className="text-lg font-black uppercase tracking-widest text-muted-gold">
            Share Your Rig
          </h1>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image URL */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
                <Camera size={14} className="inline mr-2" />
                Rig Photo URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/your-rig-photo.jpg"
                className="w-full bg-neutral-900 border-2 border-neutral-800 px-4 py-3 text-white focus:border-muted-gold focus:outline-none transition"
                required
              />
              {imageUrl && (
                <div className="mt-3 relative">
                  <img 
                    src={imageUrl} 
                    alt="Preview" 
                    className="w-full max-h-64 object-cover border-2 border-neutral-800"
                    onError={() => setError('Invalid image URL')}
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Caption */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
                Caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Tell us about your build..."
                rows={3}
                className="w-full bg-neutral-900 border-2 border-neutral-800 px-4 py-3 text-white focus:border-muted-gold focus:outline-none transition resize-none"
                required
              />
            </div>

            {/* Vehicle */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
                <Truck size={14} className="inline mr-2" />
                Vehicle
              </label>
              <input
                type="text"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                placeholder="e.g., Jeep Wrangler Rubicon"
                className="w-full bg-neutral-900 border-2 border-neutral-800 px-4 py-3 text-white focus:border-muted-gold focus:outline-none transition"
                required
              />
            </div>

            {/* Modifications */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
                <Plus size={14} className="inline mr-2" />
                Modifications
              </label>
              <input
                type="text"
                value={mods}
                onChange={(e) => setMods(e.target.value)}
                placeholder="e.g., 3&quot; Lift, 35s, Winch"
                className="w-full bg-neutral-900 border-2 border-neutral-800 px-4 py-3 text-white focus:border-muted-gold focus:outline-none transition"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
                <MapPin size={14} className="inline mr-2" />
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Cajon Pass, CA"
                className="w-full bg-neutral-900 border-2 border-neutral-800 px-4 py-3 text-white focus:border-muted-gold focus:outline-none transition"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm font-bold uppercase">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#FF8C00] hover:bg-[#FF9D00] text-white font-black uppercase tracking-widest transition disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Share Rig'}
            </button>
          </form>
        </div>
      </main>

    </div>
  );
}
