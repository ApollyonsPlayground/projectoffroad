'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'project_offroad_disclaimer_v1';

/**
 * Legal advisory gate — must not rely on Framer Motion opacity animations here:
 * on some mobile browsers + reduced-motion CSS, `initial={{ opacity: 0 }}` can stick,
 * leaving an invisible fullscreen layer that blocks all taps.
 */
export default function DisclaimerModal() {
  const [mounted, setMounted] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      setShow(!localStorage.getItem(STORAGE_KEY));
    } catch {
      setShow(true);
    }
    setResolved(true);
  }, [mounted]);

  useEffect(() => {
    if (!show) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      /* private mode — still close so app is usable */
    }
    setShow(false);
  };

  if (!mounted || !resolved || !show) return null;

  const ui = (
    <div
      role="presentation"
      className="fixed inset-0 left-0 top-0 right-0 bottom-0 z-[20000] flex items-center justify-center bg-background/95 p-5 text-left"
      style={{
        width: '100%',
        minHeight: '100dvh',
        WebkitTapHighlightColor: 'transparent',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-sm bg-muted border border-primary/35 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 ring-1 ring-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
      >
        <div className="relative bg-gradient-to-r from-primary/90 to-primary px-5 py-4 overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-20 opacity-10 pointer-events-none">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="absolute bg-background w-3 h-full"
                style={{ left: `${i * 6}px`, transform: 'skewX(-20deg)' }}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-background/25 flex items-center justify-center flex-shrink-0">
              <ShieldAlert size={22} className="text-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
                SoCalOffroaders
              </p>
              <h2 id="disclaimer-title" className="text-lg font-black text-foreground leading-tight tracking-tight">
                Off-Road Advisory
              </h2>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4">
          <p className="text-foreground/90 text-sm leading-relaxed">
            Off-roading involves{' '}
            <span className="text-primary/90 font-semibold">
              serious risk of injury, death, and vehicle damage
            </span>
            . This platform is a community resource — not a guided service.
          </p>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={13} className="text-primary flex-shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Organizer Liability
              </p>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              The site owner is <span className="text-foreground/90 font-semibold">not responsible</span> for
              cancellations or trail condition changes. Safety rests solely with each run organizer.
            </p>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            By continuing you <span className="text-foreground/90 font-semibold">assume all risk</span> and hold
            SoCalOffroaders harmless from any liability. Always verify closures with USFS/BLM before travel.
          </p>
        </div>

        <div className="px-5 pb-6">
          <button
            type="button"
            onClick={handleAccept}
            className="w-full py-4 min-h-[52px] rounded-xl bg-primary hover:opacity-90 active:bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest transition-colors touch-manipulation"
          >
            I Understand — Enter App
          </button>
          <p className="text-muted-foreground text-[10px] text-center mt-3 leading-relaxed">
            Acceptance is saved locally and will not appear again on this device.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
