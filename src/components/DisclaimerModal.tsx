'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'project_offroad_disclaimer_v1';

export default function DisclaimerModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  // Block body scroll while modal is open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  const handleAccept = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="disclaimer-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          // True full-screen overlay — covers everything, blocks all interaction
          className="fixed inset-0 w-screen h-[100dvh] z-[9999] bg-black/95 flex items-center justify-center p-5"
          // Prevent click-through to the page behind
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28, delay: 0.05 }}
            className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="disclaimer-title"
          >
            {/* Orange header band */}
            <div className="relative bg-gradient-to-r from-orange-600 to-orange-500 px-5 py-4 overflow-hidden">
              {/* Diagonal stripe accent */}
              <div className="absolute right-0 top-0 bottom-0 w-20 opacity-10 pointer-events-none">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute bg-black w-3 h-full"
                    style={{ left: `${i * 6}px`, transform: 'skewX(-20deg)' }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-full bg-black/25 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200">
                    SoCalOffroaders
                  </p>
                  <h2
                    id="disclaimer-title"
                    className="text-lg font-black text-white leading-tight tracking-tight"
                  >
                    Off-Road Advisory
                  </h2>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-4">
              <p className="text-zinc-200 text-sm leading-relaxed">
                Off-roading involves{' '}
                <span className="text-orange-400 font-semibold">
                  serious risk of injury, death, and vehicle damage
                </span>
                . This platform is a community resource — not a guided service.
              </p>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={13} className="text-orange-500 flex-shrink-0" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-orange-500">
                    Organizer Liability
                  </p>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  The site owner is{' '}
                  <span className="text-zinc-200 font-semibold">not responsible</span> for
                  cancellations or trail condition changes. Safety rests solely with each run
                  organizer.
                </p>
              </div>

              <p className="text-zinc-400 text-xs leading-relaxed">
                By continuing you{' '}
                <span className="text-zinc-200 font-semibold">assume all risk</span> and hold
                SoCalOffroaders harmless from any liability. Always verify closures with
                USFS/BLM before travel.
              </p>
            </div>

            {/* CTA */}
            <div className="px-5 pb-6">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAccept}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-black font-black text-sm uppercase tracking-widest rounded-xl transition-colors"
              >
                I Understand — Enter App
              </motion.button>
              <p className="text-zinc-600 text-[10px] text-center mt-3 leading-relaxed">
                Acceptance is saved locally and will not appear again.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
