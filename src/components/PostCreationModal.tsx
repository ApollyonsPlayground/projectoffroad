'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Loader2, MapPin, Truck } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { createClient } from '@supabase/supabase-js';

interface PostCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostSuccess?: () => void;
}

// Server-side client for uploads (uses service key)
const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export default function PostCreationModal({ isOpen, onClose, onPostSuccess }: PostCreationModalProps) {
  const supabaseAdmin = getSupabaseAdmin();
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Spring physics for modal
  const springTransition = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create local preview URL
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setImageUrl('');
    }
  };

  // Handle URL input
  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setImagePreview(null);
  };

  // Handle post submission
  const handlePost = async () => {
    if (!imageUrl && !imagePreview) {
      setError('Please select an image');
      return;
    }

    // Trigger haptic
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {}

    setLoading(true);
    setError('');

    try {
      let finalImageUrl = imageUrl || imagePreview;

      // Upload image to rig-photos bucket if we have a file
      if (imagePreview && supabaseAdmin) {
        const file = fileInputRef.current?.files?.[0];
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabaseAdmin
            .storage
            .from('rig-photos')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            // Fall back to URL
          } else {
            // Get public URL
            const { data: urlData } = supabaseAdmin
              .storage
              .from('rig-photos')
              .getPublicUrl(fileName);
            
            finalImageUrl = urlData.publicUrl;
          }
        }
      }

      // Insert post record (matching actual DB schema)
      if (supabase && isSupabaseConfigured()) {
        const { data, error: supabaseError } = await supabase
          .from('posts')
          .insert({
            image_url: finalImageUrl,
            caption: caption || `${vehicle} ${location}`.trim(),
            likes_count: 0,
            is_flagged: false
          })
          .select()
          .single();

        if (supabaseError) {
          console.error('Insert error:', supabaseError);
          throw supabaseError;
        }
        
        console.log('Post created:', data);
      }

      // Trigger haptic success
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (e) {}

      // Reset and close
      resetForm();
      onClose();
      
      // Notify parent to refresh feed
      if (onPostSuccess) {
        onPostSuccess();
      }
    } catch (err: any) {
      console.error('Post error:', err);
      setError(err.message || 'Failed to post. Please try again.');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setImageUrl('');
    setImagePreview(null);
    setCaption('');
    setVehicle('');
    setLocation('');
    setLoading(false);
    setError('');
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springTransition}
            className="fixed inset-x-0 bottom-0 top-0 md:top-auto md:h-[85vh] md:bottom-4 md:left-4 md:right-4 md:rounded-2xl bg-neutral-900 z-50 flex flex-col overflow-hidden md:border md:border-neutral-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <button 
                onClick={handleClose}
                disabled={loading}
                className="text-neutral-400 hover:text-white disabled:opacity-50"
              >
                <X size={24} />
              </button>
              <h2 className="text-lg font-black uppercase tracking-widest text-white">
                New Post
              </h2>
              <button
                onClick={handlePost}
                disabled={loading || (!imageUrl && !imagePreview)}
                className="text-[#FF8C00] font-bold disabled:opacity-50 disabled:text-neutral-400"
              >
                {loading ? 'Posting...' : 'Share'}
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              {/* Image Preview - Edge to Edge */}
              <div 
                className="relative aspect-square bg-neutral-800 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview || imageUrl ? (
                  <>
                    <img 
                      src={imagePreview || imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreview(null);
                        setImageUrl('');
                      }}
                      className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full"
                    >
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500">
                    <ImageIcon size={48} className="mb-2" />
                    <p className="font-bold">Tap to add photo</p>
                    <p className="text-sm">or enter URL below</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* URL Input (alternative to upload) */}
              <div className="p-4 border-b border-neutral-800">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="Or paste image URL..."
                  className="w-full bg-neutral-800 border border-neutral-700 px-3 py-2 text-white text-sm rounded-lg focus:outline-none focus:border-[#FF8C00]"
                />
              </div>

              {/* Caption */}
              <div className="p-4">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Caption (e.g., Testing the new 35s in Big Bear)"
                  rows={3}
                  className="w-full bg-transparent text-white placeholder-neutral-500 focus:outline-none resize-none text-lg"
                />
              </div>

              {/* Vehicle & Location */}
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center gap-2 bg-neutral-800 rounded-lg px-3 py-2">
                  <Truck size={18} className="text-neutral-400" />
                  <input
                    type="text"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    placeholder="Vehicle (e.g., Jeep Wrangler Rubicon)"
                    className="flex-1 bg-transparent text-white placeholder-neutral-500 focus:outline-none text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 bg-neutral-800 rounded-lg px-3 py-2">
                  <MapPin size={18} className="text-neutral-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Location (e.g., Cajon Pass, CA)"
                    className="flex-1 bg-transparent text-white placeholder-neutral-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="px-4 pb-4">
                  <p className="text-red-500 text-sm font-bold">{error}</p>
                </div>
              )}

              {/* Loading Overlay */}
              {loading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="text-[#FF8C00] animate-spin" />
                    <p className="text-white font-bold">Uploading Rig...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer - Post Button */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-900">
              <button
                onClick={handlePost}
                disabled={loading || (!imageUrl && !imagePreview)}
                className="w-full py-4 bg-[#FF8C00] hover:bg-[#FF9D00] text-white font-black uppercase tracking-widest transition disabled:opacity-50 rounded-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin" />
                    Uploading Rig...
                  </span>
                ) : (
                  'Share Your Rig'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}