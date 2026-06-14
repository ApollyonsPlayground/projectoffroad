'use client';

import { useCallback, useEffect, useState } from 'react';
import { Apple, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/Toast';

type AppleSecretStatus = {
  configured: boolean;
  missingEnv: string[];
  status: 'ok' | 'warning' | 'expired' | 'unknown' | 'not_configured';
  daysUntilExpiry: number | null;
  maxTtlDays: number;
  message: string;
  lastRotation: {
    rotatedAt: string;
    expiresAt: string;
    rotatedBy: string;
    servicesId: string | null;
    keyId: string | null;
  } | null;
};

type Props = {
  token: string | null;
  authHeaders: () => Record<string, string>;
};

function statusStyles(status: AppleSecretStatus['status']): {
  border: string;
  title: string;
  badge: string;
} {
  switch (status) {
    case 'expired':
      return {
        border: 'border-red-500/40 bg-red-500/10',
        title: 'text-red-100',
        badge: 'bg-red-500/25 text-red-100',
      };
    case 'warning':
      return {
        border: 'border-amber-500/40 bg-amber-500/10',
        title: 'text-amber-100',
        badge: 'bg-amber-500/25 text-amber-100',
      };
    case 'ok':
      return {
        border: 'border-emerald-500/35 bg-emerald-500/10',
        title: 'text-emerald-100',
        badge: 'bg-emerald-500/25 text-emerald-100',
      };
    case 'unknown':
      return {
        border: 'border-sky-500/35 bg-sky-500/10',
        title: 'text-sky-100',
        badge: 'bg-sky-500/25 text-sky-100',
      };
    default:
      return {
        border: 'border-border bg-card',
        title: 'text-foreground',
        badge: 'bg-muted text-muted-foreground',
      };
  }
}

function statusLabel(status: AppleSecretStatus['status'], days: number | null): string {
  if (status === 'expired') return 'Expired — rotate now';
  if (status === 'warning' && days != null) return `${days}d left`;
  if (status === 'ok' && days != null) return `${days}d left`;
  if (status === 'unknown') return 'Not tracked';
  if (status === 'not_configured') return 'Not configured';
  return '—';
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function AppleSecretAdminCard({ token, authHeaders }: Props) {
  const { showToast } = useToast();
  const [data, setData] = useState<AppleSecretStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [rotating, setRotating] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/apple-secret', { headers: authHeaders() });
      const j = (await res.json()) as AppleSecretStatus & { error?: string };
      if (!res.ok) {
        showToast(j.error ?? 'Could not load Apple secret status', 'error');
        return;
      }
      setData(j);
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const rotate = async () => {
    if (!token || rotating) return;
    if (!confirm('Generate a new Apple secret JWT and push it to Supabase?')) return;

    setRotating(true);
    try {
      const res = await fetch('/api/admin/apple-secret', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      });
      const j = (await res.json()) as { ok?: boolean; message?: string; error?: string; hint?: string };
      if (!res.ok || !j.ok) {
        showToast(j.hint ?? j.error ?? 'Rotation failed', 'error');
        return;
      }
      showToast(j.message ?? 'Apple secret rotated', 'success');
      await load();
    } finally {
      setRotating(false);
    }
  };

  const styles = statusStyles(data?.status ?? 'not_configured');
  const busy = loading || rotating;

  return (
    <div className={`rounded-xl border p-4 ${styles.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-bold mb-1 flex items-center gap-2 ${styles.title}`}>
            {busy ? <Loader2 className="animate-spin shrink-0" size={16} /> : <Apple size={16} className="shrink-0" />}
            Apple Sign In secret
          </p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {data?.message ??
              'JWT for Supabase Apple OAuth — auto-rotates monthly when Vercel env is complete.'}
          </p>
        </div>
        <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-full ${styles.badge}`}>
          {data ? statusLabel(data.status, data.daysUntilExpiry) : '…'}
        </span>
      </div>

      {data?.lastRotation ? (
        <p className="text-[11px] text-muted-foreground mt-3">
          Last rotated {formatWhen(data.lastRotation.rotatedAt)} ({data.lastRotation.rotatedBy}) · expires{' '}
          {formatWhen(data.lastRotation.expiresAt)}
        </p>
      ) : null}

      {data && !data.configured && data.missingEnv.length > 0 ? (
        <p className="text-[11px] text-muted-foreground mt-2 font-mono break-all">
          Missing on server: {data.missingEnv.join(', ')}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          disabled={!token || busy || !data?.configured}
          onClick={() => void rotate()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold disabled:opacity-50"
        >
          <RefreshCw size={14} />
          {data?.status === 'expired' ? 'Rotate now (required)' : 'Rotate now'}
        </button>
        <button
          type="button"
          disabled={!token || busy}
          onClick={() => void load()}
          className="px-3 py-2 rounded-lg border border-border text-[12px] font-bold text-muted-foreground disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">
        Apple JWT max life ~{data?.maxTtlDays ?? 182} days. Monthly Vercel cron updates Supabase when env vars are set.
      </p>
    </div>
  );
}
