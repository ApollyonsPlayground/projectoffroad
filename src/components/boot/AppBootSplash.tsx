'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Truck } from 'lucide-react';

type Props = {
  visible: boolean;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return reduced;
}

function MountainLayer({
  className,
  delay = 0,
  reducedMotion,
}: {
  className?: string;
  delay?: number;
  reducedMotion: boolean;
}) {
  if (reducedMotion) {
    return (
      <svg
        viewBox="0 0 400 120"
        className={`absolute bottom-[18%] left-0 w-[200%] max-w-none h-[38%] ${className ?? ''}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0 120 L0 72 L48 38 L96 68 L148 22 L200 58 L252 18 L304 52 L360 28 L400 48 L400 120 Z"
          fill="currentColor"
          className="text-zinc-800/90"
        />
      </svg>
    );
  }

  return (
    <motion.svg
      viewBox="0 0 400 120"
      className={`absolute bottom-[18%] left-0 w-[200%] max-w-none h-[38%] ${className ?? ''}`}
      preserveAspectRatio="none"
      aria-hidden
      initial={{ x: '-8%' }}
      animate={{ x: ['-8%', '-2%', '-8%'] }}
      transition={{ duration: 14 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <path
        d="M0 120 L0 72 L48 38 L96 68 L148 22 L200 58 L252 18 L304 52 L360 28 L400 48 L400 120 Z"
        fill="currentColor"
        className="text-zinc-800/90"
      />
    </motion.svg>
  );
}

function AnimatedScene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="relative w-full h-[42%] max-h-[220px] mt-6" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent rounded-full blur-3xl scale-150 opacity-60" />

      <MountainLayer className="opacity-40 scale-105" delay={0} reducedMotion={reducedMotion} />
      <MountainLayer className="opacity-70 -bottom-2" delay={2} reducedMotion={reducedMotion} />

      {/* Ground / trail */}
      <div className="absolute bottom-0 left-0 right-0 h-[22%] bg-gradient-to-t from-zinc-950 via-zinc-900/95 to-transparent" />
      <div className="absolute bottom-[10%] left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

      {/* Truck */}
      {reducedMotion ? (
        <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 flex items-center justify-center">
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-primary/25 blur-md" />
            <Truck size={36} className="relative text-primary" strokeWidth={2.2} />
          </div>
        </div>
      ) : (
        <motion.div
          className="absolute bottom-[12%] left-0 flex items-end"
          initial={{ x: '-15%' }}
          animate={{ x: ['-15%', '115%'] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'linear' }}
        >
          <motion.div
            animate={{ y: [0, -2, 0, -1, 0] }}
            transition={{ duration: 0.45, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-primary/20 blur-sm rounded-full" />
            <div className="absolute -inset-2 rounded-full bg-primary/20 blur-lg" />
            <Truck size={34} className="relative text-primary drop-shadow-[0_4px_12px_rgba(249,115,22,0.45)]" strokeWidth={2.4} />
          </motion.div>
        </motion.div>
      )}

      {/* Dust puffs */}
      {!reducedMotion && (
        <>
          <motion.div
            className="absolute bottom-[11%] w-2 h-2 rounded-full bg-primary/30 blur-[2px]"
            animate={{ x: ['20%', '85%'], opacity: [0, 0.7, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'linear', delay: 0.3 }}
          />
          <motion.div
            className="absolute bottom-[13%] w-1.5 h-1.5 rounded-full bg-zinc-500/40 blur-[1px]"
            animate={{ x: ['15%', '80%'], opacity: [0, 0.5, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'linear', delay: 1.1 }}
          />
        </>
      )}
    </div>
  );
}

export function AppBootSplash({ visible }: Props) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-label="Loading SoCal Offroaders"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-background overflow-hidden"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* Starfield / night sky */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950 via-background to-background" aria-hidden />
          <div
            className="pointer-events-none absolute top-[12%] left-1/4 w-1 h-1 rounded-full bg-primary/60"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute top-[18%] right-[30%] w-0.5 h-0.5 rounded-full bg-white/40"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute top-[8%] right-[22%] w-1 h-1 rounded-full bg-primary/40"
            aria-hidden
          />

          <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-8">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="text-primary-foreground font-black text-sm tracking-tight">SO</span>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  Southern California
                </p>
                <p className="text-xl font-black text-foreground tracking-tight leading-tight">
                  SoCal<span className="text-primary">Offroaders</span>
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-2 mb-2">Loading your trail…</p>

            {reducedMotion ? (
              <Loader2 size={28} className="animate-spin text-primary mt-8" aria-hidden />
            ) : (
              <AnimatedScene reducedMotion={false} />
            )}
          </div>

          {/* Progress bar */}
          <div
            className="absolute bottom-0 left-0 right-0 px-8"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
          >
            <div className="h-0.5 w-full max-w-xs mx-auto rounded-full bg-zinc-800 overflow-hidden">
              {reducedMotion ? (
                <div className="h-full w-1/3 bg-primary/80 rounded-full mx-auto" />
              ) : (
                <motion.div
                  className="h-full w-1/3 bg-primary rounded-full"
                  animate={{ x: ['-100%', '250%'] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
