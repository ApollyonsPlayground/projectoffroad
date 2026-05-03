'use client';

import { motion } from 'framer-motion';

export default function ComingSoonPage() {
  return (
    <div className="relative min-h-screen w-full bg-black overflow-hidden flex items-center justify-center">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(249, 115, 22, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249, 115, 22, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Radial glow behind text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[800px] h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(249, 115, 22, 0.15) 0%, rgba(249, 115, 22, 0.05) 40%, transparent 70%)',
          }}
        />
      </div>

      {/* Animated glowing lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute h-[2px] w-[300px] bg-gradient-to-r from-transparent via-orange-500 to-transparent"
          style={{ top: '20%', left: '-300px' }}
          animate={{ x: ['0vw', '150vw'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: 0 }}
        />
        <motion.div
          className="absolute h-[2px] w-[200px] bg-gradient-to-r from-transparent via-orange-400 to-transparent"
          style={{ top: '40%', left: '-200px' }}
          animate={{ x: ['0vw', '150vw'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 1.5 }}
        />
        <motion.div
          className="absolute h-[2px] w-[400px] bg-gradient-to-r from-transparent via-orange-600 to-transparent"
          style={{ top: '70%', left: '-400px' }}
          animate={{ x: ['0vw', '150vw'] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear', delay: 0.5 }}
        />
        <motion.div
          className="absolute h-[2px] w-[250px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"
          style={{ top: '85%', left: '-250px' }}
          animate={{ x: ['0vw', '150vw'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', delay: 2 }}
        />
      </div>

      {/* Corner accent lines */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-orange-500/30" />
      <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-orange-500/30" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-orange-500/30" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-orange-500/30" />

      {/* Main content */}
      <div className="relative z-10 text-center px-6">
        {/* Eyebrow text */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-orange-500 text-sm md:text-base uppercase tracking-[0.3em] font-semibold mb-6"
        >
          Built for the trail
        </motion.p>

        {/* Main title with glow effect */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative"
        >
          <span
            className="block text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter text-white"
            style={{
              textShadow: '0 0 60px rgba(249, 115, 22, 0.5), 0 0 120px rgba(249, 115, 22, 0.3)',
            }}
          >
            Project
          </span>
          <span
            className="block text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500"
            style={{
              textShadow: '0 0 80px rgba(249, 115, 22, 0.8)',
            }}
          >
            Offroad
          </span>
        </motion.h1>

        {/* Coming Soon badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-10 inline-flex items-center gap-3"
        >
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500" />
          <span
            className="text-lg md:text-xl lg:text-2xl font-bold uppercase tracking-[0.2em] text-zinc-300"
            style={{
              textShadow: '0 0 20px rgba(255, 255, 255, 0.2)',
            }}
          >
            Coming Soon
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500" />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="mt-8 text-zinc-500 text-base md:text-lg max-w-md mx-auto leading-relaxed"
        >
          The ultimate SoCal off-road community is gearing up. Trails. Runs. Rigs. Clubs.
        </motion.p>

        {/* Pulsing indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-16 flex justify-center"
        >
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-orange-500 animate-ping absolute" />
            <div className="w-3 h-3 rounded-full bg-orange-500" />
          </div>
        </motion.div>
      </div>

      {/* Bottom decorative bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
    </div>
  );
}
