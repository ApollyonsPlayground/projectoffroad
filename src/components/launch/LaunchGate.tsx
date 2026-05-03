'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { MarketingLanding } from '@/components/launch/MarketingLanding';

const BYPASS_KEY = 'socal_launch_bypass_v1';

function launchGateEnabled(): boolean {
  return process.env.NEXT_PUBLIC_LAUNCH_GATE_ENABLED === 'true';
}

function gateSecret(): string {
  return (process.env.NEXT_PUBLIC_LAUNCH_GATE_SECRET ?? '').trim();
}

function allowLocalhostBypass(): boolean {
  return process.env.NEXT_PUBLIC_LAUNCH_GATE_ALLOW_LOCALHOST !== 'false';
}

function isLocalDevHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.endsWith('.local') ||
    /^192\.168\.\d+\.\d+$/.test(h) ||
    /^10\.\d+\.\d+\.\d+$/.test(h)
  );
}

function persistBypass(): void {
  try {
    sessionStorage.setItem(BYPASS_KEY, '1');
  } catch {
    /* private mode */
  }
}

function readBypass(): boolean {
  try {
    return sessionStorage.getItem(BYPASS_KEY) === '1';
  } catch {
    return false;
  }
}

function tryUnlockWithSecret(candidate: string): boolean {
  const secret = gateSecret();
  if (!secret || candidate !== secret) return false;
  persistBypass();
  return true;
}

type Props = {
  children: ReactNode;
};

/**
 * When NEXT_PUBLIC_LAUNCH_GATE_ENABLED=true, visitors see the marketing screen until:
 * - localhost / LAN (unless NEXT_PUBLIC_LAUNCH_GATE_ALLOW_LOCALHOST=false), or
 * - sessionStorage bypass after correct NEXT_PUBLIC_LAUNCH_GATE_SECRET (?beta=… or form).
 */
export function LaunchGate({ children }: Props) {
  const [mounted, setMounted] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (!launchGateEnabled()) {
      setBlocked(false);
      return;
    }

    const host = window.location.hostname;

    if (allowLocalhostBypass() && isLocalDevHost(host)) {
      setBlocked(false);
      return;
    }

    if (readBypass()) {
      setBlocked(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const beta = params.get('beta');
    if (beta && tryUnlockWithSecret(beta)) {
      const path = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', path);
      setBlocked(false);
      return;
    }

    setBlocked(true);
  }, []);

  // Avoid flash: show nothing until client decides (gate disabled is immediate).
  if (!mounted && launchGateEnabled()) {
    return <div className="min-h-[100dvh] bg-black" aria-hidden />;
  }

  if (!launchGateEnabled()) {
    return <>{children}</>;
  }

  if (blocked) {
    const secretConfigured = Boolean(gateSecret());
    return (
      <MarketingLanding
        betaEnabled={secretConfigured}
        onBetaSubmit={(code) => {
          if (tryUnlockWithSecret(code)) {
            setBlocked(false);
            return true;
          }
          return false;
        }}
      />
    );
  }

  return <>{children}</>;
}
