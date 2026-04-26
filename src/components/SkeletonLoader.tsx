'use client';

import { motion } from 'framer-motion';

// Shimmer animation
const shimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'linear',
  },
};

// Post skeleton - Instagram style
export function PostSkeleton() {
  return (
    <div className="bg-neutral-900 border-2 border-neutral-800 mb-6 max-w-md mx-auto">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-neutral-800" />
          <div className="w-20 h-4 bg-neutral-800 rounded" />
        </div>
        <div className="w-6 h-6 bg-neutral-800 rounded" />
      </div>

      {/* Image skeleton - square aspect ratio */}
      <div className="aspect-square bg-neutral-800 relative overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800"
          style={{ backgroundSize: '200% 100%' }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Actions skeleton */}
      <div className="p-3">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-8 h-8 bg-neutral-800 rounded-full" />
          <div className="w-8 h-8 bg-neutral-800 rounded-full" />
          <div className="w-8 h-8 bg-neutral-800 rounded-full" />
        </div>

        {/* Likes skeleton */}
        <div className="w-16 h-4 bg-neutral-800 rounded mb-2" />

        {/* Caption skeleton */}
        <div className="w-full h-4 bg-neutral-800 rounded mb-1" />
        <div className="w-2/3 h-4 bg-neutral-800 rounded" />
      </div>
    </div>
  );
}

// Feed skeleton with multiple posts
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="pb-20">
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}

// Trail card skeleton
export function TrailCardSkeleton() {
  return (
    <div className="bg-neutral-900 border-2 border-neutral-800 p-4 mb-4 max-w-md mx-auto">
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="w-20 h-20 bg-neutral-800 rounded-lg flex-shrink-0" />
        
        {/* Content */}
        <div className="flex-1">
          <div className="w-3/4 h-5 bg-neutral-800 rounded mb-2" />
          <div className="w-1/2 h-4 bg-neutral-800 rounded mb-2" />
          <div className="flex gap-2">
            <div className="w-12 h-5 bg-neutral-800 rounded" />
            <div className="w-12 h-5 bg-neutral-800 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 bg-neutral-800 rounded-full" />
          <div className="flex-1">
            <div className="w-24 h-6 bg-neutral-800 rounded mb-2" />
            <div className="w-40 h-4 bg-neutral-800 rounded" />
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex justify-around">
          <div className="text-center">
            <div className="w-12 h-6 bg-neutral-800 rounded mb-1" />
            <div className="w-16 h-3 bg-neutral-800 rounded" />
          </div>
          <div className="text-center">
            <div className="w-12 h-6 bg-neutral-800 rounded mb-1" />
            <div className="w-16 h-3 bg-neutral-800 rounded" />
          </div>
          <div className="text-center">
            <div className="w-12 h-6 bg-neutral-800 rounded mb-1" />
            <div className="w-16 h-3 bg-neutral-800 rounded" />
          </div>
        </div>
      </div>

      {/* Posts grid skeleton */}
      <div className="grid grid-cols-3 gap-1 p-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square bg-neutral-800" />
        ))}
      </div>
    </div>
  );
}