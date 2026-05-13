'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { hapticMedium, hapticLight } from '@/hooks/useHaptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
}

export function PullToRefresh({ onRefresh, children, threshold = 100 }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const y = useMotionValue(0);
  const ySpring = useSpring(y, { stiffness: 300, damping: 30 });

  const opacity = useTransform(y, [0, threshold / 2], [0, 1]);
  const scale = useTransform(y, [0, threshold], [0.5, 1]);

  const handlePull = (deltaY: number) => {
    if (isRefreshing || !containerRef.current) return;
    
    // Only allow pulling down when at top
    if (containerRef.current.scrollTop > 0) return;
    
    const newY = Math.max(0, deltaY);
    y.set(newY);
    
    if (newY > 10 && !isPulling) {
      setIsPulling(true);
      hapticLight(); // Light haptic when starting to pull
    }
    
    // Trigger haptic at threshold
    if (newY >= threshold && !isRefreshing) {
      hapticMedium(); // Medium haptic when threshold reached
    }
  };

  const handleRelease = async () => {
    const currentY = y.get();
    
    if (currentY >= threshold && !isRefreshing) {
      // Trigger refresh
      setIsRefreshing(true);
      y.set(threshold);
      
      try {
        await onRefresh();
      } finally {
        // Reset
        setIsRefreshing(false);
        setIsPulling(false);
        y.set(0);
      }
    } else {
      // Just reset
      setIsPulling(false);
      y.set(0);
    }
  };

  // Touch event handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      currentY = e.touches[0].clientY - startY;
      if (currentY > 0) {
        handlePull(currentY);
      }
    };

    const handleTouchEnd = () => {
      handleRelease();
      startY = 0;
      currentY = 0;
    };

    // Mouse handlers for desktop testing
    const handleMouseDown = (e: MouseEvent) => {
      startY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      currentY = e.clientY - startY;
      if (currentY > 0) {
        handlePull(currentY);
      }
    };

    const handleMouseUp = () => {
      handleRelease();
      startY = 0;
      currentY = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [isRefreshing, isPulling]);

  return (
    <div ref={containerRef} className="relative overflow-auto h-full">
      {/* Pull indicator */}
      <motion.div
        style={{ y: ySpring, opacity }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
      >
        <motion.div style={{ scale }}>
          {isRefreshing ? (
            <RefreshCw className="text-muted-gold animate-spin" size={24} />
          ) : (
            <RefreshCw className="text-neutral-400" size={24} />
          )}
        </motion.div>
      </motion.div>

      {/* Content */}
      <div className={isPulling || isRefreshing ? 'opacity-50' : ''}>
        {children}
      </div>
    </div>
  );
}