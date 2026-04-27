'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

const STORAGE_KEY = 'project_offroad_disclaimer_v1';

export default function DisclaimerModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem(STORAGE_KEY);
      if (!accepted) {
        setShow(true);
      }
    } catch {
      // localStorage blocked (private browsing etc.) — show anyway
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            key="disclaimer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            key="disclaimer-modal"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30, delay: 0.05 }}
            className="fixed inset-0 z-[201] flex items-end sm:items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-sm pointer-events-auto bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
              role="dialog"
              aria-modal="true"
              aria-labelledby="disclaimer-title"
            >
              {/* Danger header band */}
              <div className="relative bg-gradient-to-r from-orange-600 to-orange-500 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center flex-shrink-0">
                    <ShieldAlert size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200">
                      Project Offroad
                    </p>
                    <h2
                      id="disclaimer-title"
                      className="text-lg font-black text-white leading-tight tracking-tight"
                    >
                      Off-Road Advisory
                    </h2>
                  </div>
                </div>
                {/* Diagonal stripe accent */}
                <div className="absolute right-0 top-0 bottom-0 w-16 opacity-10 overflow-hidden">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute bg-black w-3 h-full"
                      style={{ left: `${i * 6}px`, transform: 'skewX(-20deg)' }}
                    />
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-5 space-y-4">
                <p className="text-zinc-200 text-sm leading-relaxed">
                  Off-roading involves{' '}
                  <span className="text-orange-400 font-semibold">serious risk of injury, death, and vehicle damage</span>.
                  {' '}This platform is a community resource — not a guided service.
                </p>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} className="text-orange-500 flex-shrink-0" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-orange-500">
                      Organizer Liability
                    </p>
                  </div>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    The site owner is{' '}
                    <span className="text-zinc-200 font-semibold">not responsible</span>{' '}
                    for cancellations or trail condition changes. Safety and communication rest solely with each run organizer.
                  </p>
                </div>

                <p className="text-zinc-400 text-xs leading-relaxed">
                  By continuing you{' '}
                  <span className="text-zinc-200 font-semibold">assume all risk</span>{' '}
                  and hold Project Offroad harmless from any liability. Always verify closures with USFS/BLM before travel.
                </p>
              </div>

              {/* CTA */}
              <div className="px-5 pb-5">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAccept}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-black font-black text-sm uppercase tracking-widest rounded-xl transition-colors"
                >
                  I Understand — Enter App
                </motion.button>
                <p className="text-zinc-600 text-[10px] text-center mt-3 leading-relaxed">
                  Your acceptance is saved locally and will not be shown again.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
