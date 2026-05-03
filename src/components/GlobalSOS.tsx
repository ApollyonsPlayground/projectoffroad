'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, MapPin, Share2, Copy, X, Radio } from 'lucide-react';
import { useToast } from '@/components/Toast';

function buildEmergencyPayload(lat: number, lng: number): { text: string; mapsUrl: string } {
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const text = `EMERGENCY — SoCalOffroaders\nMy location: ${lat.toFixed(5)}, ${lng.toFixed(5)}\nOpen map: ${mapsUrl}\nSent from the app SOS.`;
  return { text, mapsUrl };
}

export default function GlobalSOS() {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payload, setPayload] = useState<{ text: string; mapsUrl: string } | null>(null);

  const acquireAndCompose = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('Location is not available on this device.', 'error');
      return;
    }
    setBusy(true);
    setPayload(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPayload(buildEmergencyPayload(lat, lng));
        setBusy(false);
      },
      () => {
        setBusy(false);
        showToast('Could not read GPS. Enable location and try again.', 'error');
      },
      { enableHighAccuracy: true, timeout: 18_000, maximumAge: 0 }
    );
  }, [showToast]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    acquireAndCompose();
  }, [acquireAndCompose]);

  const copyText = useCallback(async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload.text);
      showToast('Emergency text copied to clipboard', 'success');
    } catch {
      showToast('Could not copy — select text manually', 'error');
    }
  }, [payload, showToast]);

  const shareAll = useCallback(async () => {
    if (!payload) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Emergency location', text: payload.text, url: payload.mapsUrl });
      } else {
        await copyText();
      }
    } catch {
      showToast('Share cancelled or unavailable', 'info');
    }
  }, [payload, copyText, showToast]);

  return (
    <>
      <motion.button
        type="button"
        onClick={handleOpen}
        whileTap={{ scale: 0.94 }}
        className="fixed z-[60] right-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-900/50 ring-2 ring-red-400/80 md:h-16 md:w-16"
        style={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom, 0px))' }}
        aria-label="Open emergency SOS"
      >
        <Radio className="h-7 w-7 md:h-8 md:w-8" strokeWidth={2.5} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm"
              aria-label="Close SOS"
              onClick={() => { setOpen(false); setPayload(null); }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sos-title"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed left-4 right-4 z-[80] max-h-[85vh] overflow-y-auto rounded-2xl border border-red-500/40 bg-zinc-950 p-5 shadow-2xl"
              style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-8 w-8 text-red-500 shrink-0" />
                  <div>
                    <h2 id="sos-title" className="text-lg font-black text-white leading-tight">
                      Emergency SOS
                    </h2>
                    <p className="text-[12px] text-zinc-500 mt-1">
                      Share your coordinates with emergency contacts or 911 when you have signal.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setPayload(null); }}
                  className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {busy && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="h-10 w-10 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
                  <p className="text-sm text-zinc-400">Getting GPS…</p>
                </div>
              )}

              {!busy && payload && (
                <div className="space-y-4">
                  <pre className="text-[12px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words rounded-xl bg-black/60 border border-zinc-800 p-3 max-h-40 overflow-y-auto">
                    {payload.text}
                  </pre>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <a
                      href={payload.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm"
                    >
                      <MapPin className="h-4 w-4" />
                      Open Maps
                    </a>
                    <button
                      type="button"
                      onClick={() => void shareAll()}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-semibold text-sm"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyText()}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-semibold text-sm"
                    >
                      <Copy className="h-4 w-4" />
                      Copy text
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => acquireAndCompose()}
                    className="w-full py-2 text-[12px] text-zinc-500 hover:text-zinc-300"
                  >
                    Refresh GPS
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
