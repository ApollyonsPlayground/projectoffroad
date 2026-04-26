'use client';

import { useState, useEffect } from 'react';
import { MapPin, Flag, Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { hapticMedium, hapticLight } from '@/hooks/useHaptics';

interface RigPost {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  image_url: string;
  caption: string;
  rig_specs?: {
    vehicle: string;
    mods: string;
    location: string;
  };
  likes: number;
  comments: number;
  created_at: string;
}

interface RigPostCardProps {
  post: RigPost;
}

export default function RigPostCard({ post }: RigPostCardProps) {
  const [liked, setLiked] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);

  // Trigger haptic feedback - medium for actions like like
  const triggerHaptic = async () => {
    await hapticMedium(); // Like = medium impact
  };

  const handleLike = async () => {
    // Optimistic UI: immediate visual feedback
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);
    
    // Trigger haptic
    await triggerHaptic();
  };

  return (
    <div className="bg-neutral-900 border-2 border-neutral-800 mb-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-moss rounded-full flex items-center justify-center text-xs font-bold text-white">
            {post.user_name.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-bold text-neutral-200">{post.user_name}</span>
        </div>
        <button 
          onClick={() => setShowReport(!showReport)}
          className="text-neutral-500 hover:text-neutral-300"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Report dropdown */}
      {showReport && (
        <div className="absolute right-4 mt-2 bg-neutral-800 border border-neutral-700 p-2 z-10">
          <button className="flex items-center gap-2 text-red-400 text-sm hover:text-red-300 w-full">
            <Flag size={14} />
            Report Post
          </button>
        </div>
      )}

      {/* Image - Instagram style */}
      <div className="relative aspect-square bg-neutral-800 overflow-hidden">
        <img 
          src={post.image_url} 
          alt={post.caption}
          className="w-full h-full object-cover"
        />
        
        {/* Rig Specs Overlay */}
        {post.rig_specs && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <div className="flex flex-wrap gap-1">
              {post.rig_specs.vehicle && (
                <span className="px-2 py-0.5 bg-moss/80 text-white text-xs font-medium">
                  {post.rig_specs.vehicle}
                </span>
              )}
              {post.rig_specs.mods && (
                <span className="px-2 py-0.5 bg-muted-gold/80 text-black text-xs font-medium">
                  {post.rig_specs.mods}
                </span>
              )}
              {post.rig_specs.location && (
                <span className="px-2 py-0.5 bg-neutral-800/80 text-neutral-300 text-xs flex items-center gap-1">
                  <MapPin size={10} />
                  {post.rig_specs.location}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={handleLike}
            className={`${liked ? 'text-[#FF8C00]' : 'text-neutral-300'} hover:text-[#FF8C00] transition`}
          >
            <Heart size={22} fill={liked ? "currentColor" : "none"} />
          </button>
          <button className="text-neutral-300 hover:text-white">
            <MessageCircle size={22} />
          </button>
          <button className="text-neutral-300 hover:text-white">
            <Share2 size={22} />
          </button>
        </div>

        {/* Likes */}
        <p className="text-sm font-bold text-neutral-200 mb-1">
          {likeCount} likes
        </p>

        {/* Caption */}
        <p className="text-sm text-neutral-300">
          <span className="font-bold mr-2">{post.user_name}</span>
          {post.caption}
        </p>

        {/* Timestamp */}
        <p className="text-xs text-neutral-500 mt-2 uppercase">
          {new Date(post.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}