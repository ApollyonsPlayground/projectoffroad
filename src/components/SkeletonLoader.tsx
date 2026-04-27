'use client';

import { motion } from 'framer-motion';

// Shimmer skeleton base component
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-shimmer rounded ${className}`} />
  );
}

// Post skeleton - Instagram style with shimmer
export function PostSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 mb-4"
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-16 h-3" />
          </div>
        </div>
        <Skeleton className="w-6 h-6" />
      </div>

      {/* Image skeleton - square aspect ratio */}
      <div className="aspect-square bg-zinc-800 relative overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800"
          style={{ backgroundSize: '200% 100%' }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Actions skeleton */}
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-4">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>

        {/* Likes */}
        <Skeleton className="w-20 h-4" />

        {/* Caption */}
        <div className="space-y-2">
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-3/4 h-4" />
        </div>

        {/* Timestamp */}
        <Skeleton className="w-24 h-3" />
      </div>
    </motion.div>
  );
}

// Feed skeleton with staggered animation
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <PostSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

// Trail card skeleton
export function TrailCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 p-4"
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        <Skeleton className="w-24 h-24 flex-shrink-0" />
        
        {/* Content */}
        <div className="flex-1 space-y-2">
          <Skeleton className="w-3/4 h-5" />
          <Skeleton className="w-1/2 h-4" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="w-16 h-6" />
            <Skeleton className="w-16 h-6" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Trail list skeleton
export function TrailListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <TrailCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

// Club card skeleton
export function ClubCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-zinc-900 border border-zinc-800 overflow-hidden"
    >
      {/* Club poster/banner */}
      <Skeleton className="w-full h-32" />
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="w-2/3 h-5" />
            <Skeleton className="w-1/3 h-3" />
          </div>
        </div>
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-3/4 h-4" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </div>
    </motion.div>
  );
}

// Club list skeleton
export function ClubListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08 }}
        >
          <ClubCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

// Run card skeleton
export function RunCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-zinc-900 border border-zinc-800 p-4"
    >
      <div className="flex justify-between items-start mb-3">
        <Skeleton className="w-2/3 h-6" />
        <Skeleton className="w-16 h-6" />
      </div>
      <div className="space-y-2 mb-4">
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-3/4 h-4" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-24 h-4" />
      </div>
      <div className="mt-4 pt-3 border-t border-zinc-800 flex gap-3">
        <Skeleton className="flex-1 h-10" />
        <Skeleton className="w-10 h-10" />
      </div>
    </motion.div>
  );
}

// Run list skeleton
export function RunListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <RunCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-32 h-6" />
            <Skeleton className="w-48 h-4" />
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex justify-around py-4 border-y border-zinc-800">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-1">
              <Skeleton className="w-12 h-6 mx-auto" />
              <Skeleton className="w-16 h-3 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Posts grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  );
}

// Chat message skeleton
export function ChatMessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={`flex gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {!isOwn && <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />}
      <div className={`space-y-1 ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && <Skeleton className="w-20 h-3" />}
        <Skeleton className={`h-10 ${isOwn ? 'w-48' : 'w-56'}`} />
      </div>
    </div>
  );
}

// Chat skeleton
export function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <ChatMessageSkeleton />
      <ChatMessageSkeleton isOwn />
      <ChatMessageSkeleton />
      <ChatMessageSkeleton />
      <ChatMessageSkeleton isOwn />
    </div>
  );
}
