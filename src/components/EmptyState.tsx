'use client';

import { motion } from 'framer-motion';
import { Truck, Users, MapPin, Image, MessageCircle, Plus } from 'lucide-react';
import Link from 'next/link';

type EmptyStateType = 'posts' | 'runs' | 'clubs' | 'trails' | 'messages' | 'saved';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

const emptyStateConfig = {
  posts: {
    icon: Truck,
    title: 'No rigs yet',
    description: 'Be the first to share your off-road rig!',
    actionLabel: 'Post Your Rig',
    actionHref: '/',
  },
  runs: {
    icon: MapPin,
    title: 'No upcoming runs',
    description: 'Join a club to see their upcoming runs or host your own!',
    actionLabel: 'Create Run',
    actionHref: '/runs',
  },
  clubs: {
    icon: Users,
    title: 'No clubs nearby',
    description: 'Clubs in your area will appear here. Join one to get started!',
    actionLabel: 'Browse Clubs',
    actionHref: '/clubs',
  },
  trails: {
    icon: MapPin,
    title: 'No trails found',
    description: 'Try a different region or explore all trails.',
    actionLabel: 'View All Trails',
    actionHref: '/runs',
  },
  messages: {
    icon: MessageCircle,
    title: 'No messages yet',
    description: 'Start a conversation with other off-roaders!',
    actionLabel: 'Explore Rigs',
    actionHref: '/',
  },
  saved: {
    icon: Image,
    title: 'No saved posts',
    description: 'Posts you save will appear here for easy access.',
    actionLabel: 'Explore Rigs',
    actionHref: '/',
  },
};

export function EmptyState({ 
  type, 
  title, 
  description, 
  actionLabel, 
  actionHref 
}: EmptyStateProps) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Animated icon container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="w-24 h-24 rounded-full bg-neutral-900 border-2 border-neutral-800 flex items-center justify-center mb-6"
      >
        <Icon size={40} className="text-neutral-500" strokeWidth={1.5} />
      </motion.div>
      
      {/* Title */}
      <motion.h3
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-bold text-neutral-200 mb-2"
      >
        {title || config.title}
      </motion.h3>
      
      {/* Description */}
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-neutral-400 text-center max-w-xs mb-6"
      >
        {description || config.description}
      </motion.p>
      
      {/* Action button */}
      {(actionLabel || config.actionLabel) && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Link
            href={actionHref || config.actionHref || '/'}
            className="inline-flex items-center gap-2 px-6 py-3 bg-muted-gold text-primary-foreground font-bold rounded-lg hover:bg-muted-gold/90 transition-colors"
          >
            <Plus size={18} />
            {actionLabel || config.actionLabel}
          </Link>
        </motion.div>
      )}
    </div>
  );
}

// Compact version for inline use
export function EmptyStateInline({ type }: { type: EmptyStateType }) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;
  
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <Icon size={32} className="text-neutral-600 mb-3" strokeWidth={1.5} />
      <p className="text-neutral-400 text-sm">{config.description}</p>
    </div>
  );
}