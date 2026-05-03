'use client';

import { useState } from 'react';
import { Mountain } from 'lucide-react';

type Props = {
  onBetaSubmit: (code: string) => void;
  betaEnabled: boolean;
};

/**
 * Mirrors the public marketing screen at socaloffroaders.com (dark, minimal “coming soon”).
 */
export function MarketingLanding({ onBetaSubmit, betaEnabled }: Props) {
  const [betaOpen, setBetaOpen] = useState(false);
  const [code, setCode] = useState('');
  const [shake, setShake] = useState(false);

  const tryBeta = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const ok = onBetaSubmit(trimmed);
    if (!ok) {
      setShake(true);
      window.setTimeout(() => setShake(false), 400);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center px-6 pb-safe overflow-y-auto">
      <div className="max-w-md w-full flex flex-col items-center text-center gap-8 py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/35 flex items-center justify-center">
            <Mountain className="text-orange-500" size={28} strokeWidth={2} />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            SoCal Off-Roaders · Community App
          </p>
          <p className="text-sm text-zinc-400 font-medium">Built for the trail</p>
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-[0.12em] uppercase leading-tight text-white">
            So Cal Offroaders
          </h1>
          <p className="text-lg font-black text-orange-500 uppercase tracking-[0.35em]">Coming Soon</p>
          <p className="text-[15px] text-zinc-400 leading-relaxed">
            The ultimate SoCal off-road community is gearing up. Trails. Runs. Rigs. Clubs.
          </p>
        </div>

        <div className="w-full pt-4 border-t border-zinc-800/80">
          {betaEnabled ? (
            <>
              <button
                type="button"
                onClick={() => setBetaOpen((o) => !o)}
                className="text-[12px] text-zinc-500 hover:text-orange-400 font-semibold transition-colors touch-manipulation py-2"
              >
                {betaOpen ? 'Hide beta access' : 'Beta access — enter app'}
              </button>
              {betaOpen && (
                <div
                  className={`mt-3 flex flex-col gap-2 transition-transform ${shake ? 'animate-pulse' : ''}`}
                >
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder="Access code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') tryBeta();
                    }}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-[15px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 min-h-[48px]"
                  />
                  <button
                    type="button"
                    onClick={tryBeta}
                    className="w-full min-h-[48px] rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-black text-[14px] transition-colors touch-manipulation"
                  >
                    Unlock web app
                  </button>
                  <p className="text-[10px] text-zinc-600 text-center leading-snug">
                    Or append <span className="font-mono text-zinc-500">?beta=YOUR_CODE</span> once — same code as{' '}
                    <span className="font-mono">NEXT_PUBLIC_LAUNCH_GATE_SECRET</span>.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-[11px] text-zinc-600 text-center">
              Beta unlock is off — set <span className="font-mono">NEXT_PUBLIC_LAUNCH_GATE_SECRET</span> to enable
              bypass, or open from localhost with auto-bypass.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
