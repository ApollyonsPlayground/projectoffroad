'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import type { MonitoringPayload, StatusLevel } from '@/lib/admin/monitoring/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';

function statusDot(level: StatusLevel) {
  const cls =
    level === 'crit'
      ? 'bg-red-500'
      : level === 'warn'
        ? 'bg-amber-400'
        : level === 'ok'
          ? 'bg-emerald-500'
          : 'bg-zinc-600';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${cls}`} title={level} />;
}

function formatBytes(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  if (n < 1024) return `${Math.round(n)} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  const gb = mb / 1024;
  return `${gb < 10 ? gb.toFixed(2) : gb.toFixed(1)} GB`;
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

function MiniBars(props: {
  title: string;
  rows: { label: string; value: number }[];
  valueRender?: (n: number) => string;
}) {
  const { title, rows, valueRender } = props;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <p className="text-[11px] font-bold text-zinc-500 uppercase">{title}</p>
      <div className="flex items-end gap-1 h-24">
        {rows.map((r) => (
          <div key={r.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div
              className="w-full bg-primary/90 rounded-t-sm min-h-[4px] transition-all"
              style={{ height: `${Math.max(8, (r.value / max) * 100)}%` }}
              title={`${r.label}: ${valueRender ? valueRender(r.value) : r.value}`}
            />
            <span className="text-[9px] text-zinc-600 truncate w-full text-center">
              {r.label.includes('T') ? r.label.slice(5, 13) : r.label.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function MonitoringDashboard() {
  const router = useRouter();
  const { user, supabaseClient, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [role, setRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MonitoringPayload | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseClient || !user) return;
    supabaseClient.auth.getSession().then(({ data: s }) => {
      setToken(s.session?.access_token ?? null);
    });
  }, [supabaseClient, user]);

  useEffect(() => {
    if (!supabaseClient || !user) return;
    supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const r = String((data as { role?: string } | null)?.role ?? '').trim().toLowerCase();
        setRole(r || null);
      });
  }, [supabaseClient, user]);

  const allowed = role === 'owner' || role === 'admin';

  useEffect(() => {
    if (!authLoading && user && role !== null && !allowed) {
      showToast('Admin access only', 'error');
      router.replace('/feed/');
    }
  }, [authLoading, user, allowed, role, router, showToast]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadErr(null);
    try {
      const res = await fetch('/api/admin/monitoring', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await parseJsonSafe<MonitoringPayload & { error?: string }>(res);
      if (!res.ok) {
        setLoadErr(j?.error ?? `Failed (${res.status})`);
        setData(null);
        return;
      }
      if (j && typeof j === 'object' && !('error' in j && j.error)) setData(j as MonitoringPayload);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!allowed || !token) return;
    queueMicrotask(() => void load());
  }, [allowed, token, load]);

  const vercelCostBars = useMemo(() => {
    const daily = data?.vercel.billing?.dailyCostUsd ?? [];
    const tail = daily.slice(-7);
    return tail.map((d) => ({ label: d.day, value: d.usd }));
  }, [data]);

  const supabaseApiBars = useMemo(() => {
    const hist = data?.supabase.apiHistory ?? [];
    const tail = hist.slice(-7);
    return tail.map((p) => ({
      label: p.label,
      value: p.rest + p.auth + p.storage + p.realtime,
    }));
  }, [data]);

  if (authLoading || !user || role === null) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black pb-28">
      <header className="sticky top-0 z-40 bg-black/95 border-b border-zinc-800 backdrop-blur-xl safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/admin" className="p-2 -ml-2 text-zinc-400 hover:text-white touch-manipulation">
            <ArrowLeft size={22} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white truncate">Monitoring</h1>
            <p className="text-[11px] text-zinc-500 truncate">Vercel · Supabase · Sightengine status</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="p-2 text-primary hover:text-primary/90 disabled:opacity-40 touch-manipulation"
            aria-label="Refresh"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-4">
        {loadErr && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-[13px] text-red-200">{loadErr}</div>
        )}

        {loading && !data && (
          <div className="min-h-[30vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {data && (
          <>
            <p className="text-[12px] text-zinc-500">
              Updated <span className="text-zinc-400 font-mono">{new Date(data.generatedAt).toLocaleString()}</span>
            </p>

            {data.alerts.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-zinc-500 uppercase">Alerts</p>
                {data.alerts.map((a, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-[13px] ${
                      a.level === 'crit'
                        ? 'bg-red-950/35 border-red-800 text-red-100'
                        : 'bg-amber-950/25 border-amber-800/60 text-amber-50'
                    }`}
                  >
                    {statusDot(a.level)}
                    <span>{a.message}</span>
                  </div>
                ))}
              </div>
            )}

            <section className="space-y-2">
              <div className="flex items-center gap-2">
                {statusDot(
                  data.vercel.error || data.vercel.billingError
                    ? 'unknown'
                    : data.vercel.configured
                      ? 'ok'
                      : 'unknown',
                )}
                <h2 className="text-sm font-black text-white uppercase tracking-wide">Vercel</h2>
              </div>
              {data.vercel.error && (
                <p className="text-[13px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg p-3">{data.vercel.error}</p>
              )}
              {data.vercel.deploymentsError && (
                <p className="text-[13px] text-amber-200/90 bg-amber-950/20 border border-amber-800/40 rounded-lg p-3">
                  {data.vercel.deploymentsError}
                </p>
              )}
              {!data.vercel.error && (
                <div className="grid gap-3">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] font-bold text-zinc-500 uppercase">Deployments (7d)</p>
                      <p className="text-xl font-black text-white mt-1">{data.vercel.deploymentsLast7d ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-zinc-500 uppercase">Latest ready</p>
                      <p className="text-xl font-black text-white mt-1">{data.vercel.latestReadyState ?? '—'}</p>
                    </div>
                  </div>

                  {data.vercel.billing && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                      <p className="text-[11px] font-bold text-zinc-500 uppercase">Month-to-date (usage lines)</p>
                      <p className="text-2xl font-black text-primary/90 mt-1">
                        {formatUsd(data.vercel.billing.monthToDateCostUsd)}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-2">
                        From FOCUS billing export (Usage rows). May omit taxes & fixed plan fees.
                      </p>
                    </div>
                  )}
                  {data.vercel.billingError && (
                    <p className="text-[12px] text-amber-200/90 bg-amber-950/20 border border-amber-800/40 rounded-lg p-3">
                      {data.vercel.billingError}
                    </p>
                  )}

                  {data.vercel.usage && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                      <p className="text-[11px] font-bold text-zinc-500 uppercase">Usage vs limits</p>
                      <p className="text-[11px] text-zinc-500">{data.vercel.usageNote}</p>
                      {(
                        [
                          ['Invocations', data.vercel.usage.invocations],
                          ['Bandwidth (GB)', data.vercel.usage.bandwidthGb],
                          ['Build minutes', data.vercel.usage.buildMinutes],
                        ] as const
                      ).map(([label, u]) => (
                        <div key={label} className="flex justify-between gap-2 text-[13px] border-t border-zinc-800 pt-2 first:border-t-0 first:pt-0">
                          <span className="text-zinc-400">{label}</span>
                          <span className="font-mono text-white text-right">
                            {u?.used ?? '—'}
                            {u?.limit != null ? (
                              <span className="text-zinc-500">
                                {' '}
                                / {u.limit}
                                {u?.pct != null ? (
                                  <span className={u.pct >= 80 ? 'text-red-400' : u.pct >= 60 ? 'text-amber-300' : 'text-emerald-400'}>
                                    {' '}
                                    ({u.pct}%)
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              <span className="text-zinc-600 text-[11px] ml-1">no limit env</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {data.vercel.billing?.breakdown?.length ? (
                    <details className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                      <summary className="text-[12px] font-bold text-zinc-300 cursor-pointer">
                        Billing breakdown (top)
                      </summary>
                      <ul className="mt-3 space-y-2 text-[12px] text-zinc-400">
                        {data.vercel.billing.breakdown.slice(0, 12).map((r, i) => (
                          <li key={i} className="flex justify-between gap-2">
                            <span className="truncate">{r.serviceName}</span>
                            <span className="font-mono shrink-0">
                              {r.effectiveCostUsd != null ? formatUsd(r.effectiveCostUsd) : '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}

                  {vercelCostBars.length > 0 && (
                    <MiniBars title="Vercel usage cost by day (MTD tail)" rows={vercelCostBars} valueRender={(n) => formatUsd(n)} />
                  )}
                </div>
              )}
            </section>

            <section className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                {statusDot(data.supabase.error ? 'unknown' : data.supabase.configured ? 'ok' : 'unknown')}
                <h2 className="text-sm font-black text-white uppercase tracking-wide">Supabase</h2>
              </div>
              {data.supabase.error && (
                <p className="text-[13px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg p-3">{data.supabase.error}</p>
              )}
              {!data.supabase.error && (
                <div className="grid gap-3">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <p className="text-[11px] font-bold text-zinc-500 uppercase">Project</p>
                      <p className="text-[13px] font-mono text-zinc-300 mt-1">{data.supabase.projectRef ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-zinc-500 uppercase">Database disk</p>
                      <p className="text-[13px] text-white mt-1 flex items-center gap-2">
                        {statusDot(
                          data.supabase.database?.pct != null
                            ? data.supabase.database.pct >= 80
                              ? 'crit'
                              : data.supabase.database.pct >= 60
                                ? 'warn'
                                : 'ok'
                            : 'unknown',
                        )}
                        <span>
                          {formatBytes(data.supabase.database?.usedBytes)} /{' '}
                          {formatBytes(data.supabase.database?.totalBytes)}
                          {data.supabase.database?.pct != null ? (
                            <span className="text-zinc-500"> ({data.supabase.database.pct}%)</span>
                          ) : null}
                        </span>
                      </p>
                      {data.supabase.databaseError && (
                        <p className="text-[11px] text-amber-300 mt-1">{data.supabase.databaseError}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-zinc-500 uppercase">Auth users</p>
                      <p className="text-xl font-black text-white mt-1">{data.supabase.authUsers ?? '—'}</p>
                      {data.supabase.authUsersError && (
                        <p className="text-[11px] text-amber-300 mt-1">{data.supabase.authUsersError}</p>
                      )}
                    </div>
                  </div>

                  {data.supabase.apiTotals && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                      <p className="text-[11px] font-bold text-zinc-500 uppercase">Latest API bucket totals</p>
                      <p className="text-[11px] text-zinc-500">{data.supabase.apiTotalsNote}</p>
                      <div className="grid grid-cols-2 gap-2 text-[13px]">
                        <div>
                          <span className="text-zinc-500">REST</span>{' '}
                          <span className="font-mono text-white">{data.supabase.apiTotals.rest}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Auth</span>{' '}
                          <span className="font-mono text-white">{data.supabase.apiTotals.auth}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Storage</span>{' '}
                          <span className="font-mono text-white">{data.supabase.apiTotals.storage}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Realtime</span>{' '}
                          <span className="font-mono text-white">{data.supabase.apiTotals.realtime}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-600">{data.supabase.realtimeNote}</p>
                    </div>
                  )}

                  {data.supabase.apiHistoryError && (
                    <p className="text-[12px] text-amber-200/90 bg-amber-950/20 border border-amber-800/40 rounded-lg p-3">
                      {data.supabase.apiHistoryError}
                    </p>
                  )}

                  {supabaseApiBars.length > 0 && (
                    <MiniBars
                      title="Supabase API volume (7d buckets)"
                      rows={supabaseApiBars}
                      valueRender={(n) => n.toLocaleString()}
                    />
                  )}

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-[11px] font-bold text-zinc-500 uppercase mb-2">Storage buckets</p>
                    {data.supabase.bucketsError && (
                      <p className="text-[12px] text-amber-300">{data.supabase.bucketsError}</p>
                    )}
                    {!data.supabase.buckets?.length && !data.supabase.bucketsError ? (
                      <p className="text-[13px] text-zinc-500">None listed</p>
                    ) : (
                      <ul className="space-y-1 text-[13px] text-zinc-300">
                        {data.supabase.buckets?.map((b) => (
                          <li key={b.id} className="flex justify-between gap-2">
                            <span className="font-mono truncate">{b.name}</span>
                            <span className="text-zinc-500 shrink-0">{b.public ? 'public' : 'private'}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                {statusDot(data.sightengine.configuredOnVercel ? 'ok' : 'warn')}
                <h2 className="text-sm font-black text-white uppercase tracking-wide">Sightengine</h2>
              </div>
              <p className="text-[13px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-xl p-4">{data.sightengine.note}</p>
            </section>

            <p className="text-[11px] text-zinc-600 leading-relaxed pt-2">
              Configure server env on Vercel: <span className="font-mono text-zinc-500">VERCEL_TOKEN</span>,{' '}
              <span className="font-mono text-zinc-500">VERCEL_PROJECT_ID</span>, optional{' '}
              <span className="font-mono text-zinc-500">VERCEL_TEAM_ID</span>, optional{' '}
              <span className="font-mono text-zinc-500">VERCEL_LIMIT_*</span>;{' '}
              <span className="font-mono text-zinc-500">SUPABASE_MANAGEMENT_ACCESS_TOKEN</span>, optional{' '}
              <span className="font-mono text-zinc-500">SUPABASE_PROJECT_REF</span>.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
