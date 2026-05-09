import { getSupabaseUrl } from '@/utils/supabase/env';
import type {
  BillingBreakdownRow,
  MonitoringAlert,
  MonitoringPayload,
  UsagePoint,
} from '@/lib/admin/monitoring/types';

const VERCEL_API = 'https://api.vercel.com';
const SUPABASE_MGMT = 'https://api.supabase.com/v1';

function envInt(name: string): number | null {
  const v = process.env[name]?.trim();
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function projectRefFromSupabaseUrl(urlStr: string): string | null {
  try {
    const host = new URL(urlStr).hostname.toLowerCase();
    const m = /^([a-z0-9-]{10,})\.supabase\.co$/.exec(host);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

type FocusCharge = {
  ChargeCategory?: string;
  ChargePeriodStart?: string;
  EffectiveCost?: number;
  BilledCost?: number;
  ConsumedQuantity?: number | null;
  ConsumedUnit?: string | null;
  ServiceName?: string;
  Tags?: Record<string, string>;
};

function parseJsonlBilling(text: string): FocusCharge[] {
  const out: FocusCharge[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t) as FocusCharge;
      if (o && typeof o === 'object') out.push(o);
    } catch {
      /* skip malformed lines */
    }
  }
  return out;
}

function monthUtcRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return { from: start.toISOString(), to: nextMonth.toISOString() };
}

function lastDaysUtcRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  return { from: from.toISOString(), to: to.toISOString() };
}

async function vercelFetchJson<T>(
  token: string,
  path: string,
  params?: Record<string, string | undefined>,
): Promise<{ ok: boolean; status: number; data?: T; text?: string }> {
  const u = new URL(path.startsWith('http') ? path : `${VERCEL_API}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') u.searchParams.set(k, v);
    }
  }
  const res = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, status: res.status, text };
  try {
    return { ok: true, status: res.status, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, status: res.status, text: text.slice(0, 500) };
  }
}

async function vercelFetchBilling(token: string, teamId: string | undefined, from: string, to: string) {
  const u = new URL(`${VERCEL_API}/v1/billing/charges`);
  u.searchParams.set('from', from);
  u.searchParams.set('to', to);
  if (teamId) u.searchParams.set('teamId', teamId);

  const res = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/jsonl, application/x-ndjson, */*' },
    cache: 'no-store',
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

function aggregateBilling(
  charges: FocusCharge[],
  projectId?: string,
): NonNullable<MonitoringPayload['vercel']['billing']> {
  const filterProj = (c: FocusCharge) => {
    if (!projectId) return true;
    const pid = c.Tags?.ProjectId ?? c.Tags?.projectId;
    return !pid || pid === projectId;
  };

  let monthToDateCostUsd = 0;
  const dailyMap = new Map<string, number>();
  const breakdownMap = new Map<string, BillingBreakdownRow>();

  for (const c of charges) {
    if (!filterProj(c)) continue;
    if (c.ChargeCategory !== 'Usage') continue;

    const usd = typeof c.EffectiveCost === 'number' ? c.EffectiveCost : Number(c.BilledCost ?? 0);
    if (Number.isFinite(usd)) monthToDateCostUsd += usd;

    const day = (c.ChargePeriodStart ?? '').slice(0, 10);
    if (day) dailyMap.set(day, (dailyMap.get(day) ?? 0) + usd);

    const svc = String(c.ServiceName ?? 'Unknown');
    const unit = c.ConsumedUnit != null ? String(c.ConsumedUnit) : null;
    const qty =
      typeof c.ConsumedQuantity === 'number' && Number.isFinite(c.ConsumedQuantity) ? c.ConsumedQuantity : null;
    const key = `${svc}|||${unit ?? ''}`;
    const prev = breakdownMap.get(key);
    breakdownMap.set(key, {
      serviceName: svc,
      consumedUnit: unit,
      consumedQuantity: (prev?.consumedQuantity ?? 0) + (qty ?? 0),
      effectiveCostUsd: (prev?.effectiveCostUsd ?? 0) + usd,
    });
  }

  const dailyCostUsd = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, usd]) => ({ day, usd }));

  const breakdown = [...breakdownMap.values()]
    .filter((r) => (r.effectiveCostUsd ?? 0) > 0 || (r.consumedQuantity ?? 0) > 0)
    .sort((a, b) => (b.effectiveCostUsd ?? 0) - (a.effectiveCostUsd ?? 0))
    .slice(0, 24);

  return { monthToDateCostUsd, currency: 'USD', dailyCostUsd, breakdown };
}

function extractUsageFromBreakdown(
  breakdown: BillingBreakdownRow[],
  limits: { invocations: number | null; bandwidthGb: number | null; buildMinutes: number | null },
): NonNullable<MonitoringPayload['vercel']['usage']> {
  const matchQty = (pred: (svc: string, unit: string) => boolean): number => {
    let sum = 0;
    for (const r of breakdown) {
      const svc = r.serviceName.toLowerCase();
      const unit = (r.consumedUnit ?? '').toLowerCase();
      if (!pred(svc, unit)) continue;
      sum += r.consumedQuantity ?? 0;
    }
    return sum;
  };

  const invocations = matchQty(
    (svc, unit) =>
      unit.includes('invocation') ||
      svc.includes('function invocation') ||
      svc.includes('serverless functions'),
  );

  let bandwidthGb = matchQty((svc, unit) => unit.includes('gb') && (svc.includes('transfer') || svc.includes('data')));
  if (!bandwidthGb) {
    const bytes = matchQty((svc, unit) => unit.includes('byte') && svc.includes('transfer'));
    if (bytes > 0) bandwidthGb = bytes / 1e9;
  }

  const buildMinutes = matchQty((svc, unit) => svc.includes('build') && (unit.includes('minute') || unit.includes('min')));

  const pct = (used: number, limit: number | null) =>
    limit != null && limit > 0 ? Math.min(100, Math.round((used / limit) * 1000) / 10) : null;

  return {
    invocations: { used: invocations, limit: limits.invocations, pct: pct(invocations, limits.invocations) },
    bandwidthGb: { used: bandwidthGb, limit: limits.bandwidthGb, pct: pct(bandwidthGb, limits.bandwidthGb) },
    buildMinutes: { used: buildMinutes, limit: limits.buildMinutes, pct: pct(buildMinutes, limits.buildMinutes) },
  };
}

export async function buildMonitoringPayload(): Promise<MonitoringPayload> {
  const generatedAt = new Date().toISOString();
  const alerts: MonitoringAlert[] = [];

  const vercelToken = process.env.VERCEL_TOKEN?.trim() || process.env.VERCEL_API_TOKEN?.trim();
  const vercelTeamId = process.env.VERCEL_TEAM_ID?.trim();
  const vercelProjectId = process.env.VERCEL_PROJECT_ID?.trim();

  const limitInv = envInt('VERCEL_LIMIT_INVOCATIONS') ?? envInt('VERCEL_PLAN_LIMIT_INVOCATIONS');
  const limitBw = envInt('VERCEL_LIMIT_BANDWIDTH_GB') ?? envInt('VERCEL_PLAN_LIMIT_BANDWIDTH_GB');
  const limitBuild = envInt('VERCEL_LIMIT_BUILD_MINUTES') ?? envInt('VERCEL_PLAN_LIMIT_BUILD_MINUTES');

  const supabaseMgmtToken =
    process.env.SUPABASE_MANAGEMENT_ACCESS_TOKEN?.trim() ||
    process.env.SUPABASE_ACCESS_TOKEN?.trim() ||
    '';

  const supabaseUrl = getSupabaseUrl();
  const projectRef =
    process.env.SUPABASE_PROJECT_REF?.trim() || (supabaseUrl ? projectRefFromSupabaseUrl(supabaseUrl) : null);

  const sightConfigured =
    Boolean(process.env.SIGHTENGINE_API_USER?.trim()) && Boolean(process.env.SIGHTENGINE_API_SECRET?.trim());

  const payload: MonitoringPayload = {
    generatedAt,
    alerts,
    vercel: {
      configured: Boolean(vercelToken && vercelProjectId),
      projectId: vercelProjectId,
      billingError: undefined,
      usageNote:
        'Usage quantities use Vercel billing line items when team billing export is available. Set VERCEL_LIMIT_* env vars for thresholds.',
    },
    supabase: {
      configured: Boolean(supabaseMgmtToken && projectRef),
      projectRef: projectRef ?? undefined,
      realtimeNote:
        'Management analytics exposes realtime API requests per bucket, not live websocket connection counts.',
    },
    sightengine: {
      configuredOnVercel: sightConfigured,
      note: sightConfigured
        ? 'Sightengine keys are set on this deployment (moderation path active). Credits are managed in the Sightengine dashboard — no usage API wired here.'
        : 'Sightengine not configured on Vercel (moderation may fall through to Edge or skip).',
    },
  };

  /** ---------- Vercel ---------- */
  if (!vercelToken || !vercelProjectId) {
    payload.vercel.error =
      !vercelToken
        ? 'Set VERCEL_TOKEN (or VERCEL_API_TOKEN) with scope to read deployments.'
        : 'Set VERCEL_PROJECT_ID (Dashboard → Project Settings → General).';
  } else {
    try {
      const depRange = lastDaysUtcRange(8);
      const fromMs = new Date(depRange.from).getTime();

      const depRes = await vercelFetchJson<{ deployments?: Record<string, unknown>[] }>(vercelToken, '/v6/deployments', {
        projectId: vercelProjectId,
        limit: '100',
        ...(vercelTeamId ? { teamId: vercelTeamId } : {}),
      });

      function deploymentCreatedMs(d: Record<string, unknown>): number {
        if (typeof d.created === 'number' && Number.isFinite(d.created)) return d.created;
        if (typeof d.createdAt === 'number' && Number.isFinite(d.createdAt)) return d.createdAt;
        if (typeof d.createdAt === 'string') {
          const t = Date.parse(d.createdAt);
          return Number.isFinite(t) ? t : 0;
        }
        return 0;
      }

      if (depRes.ok && depRes.data?.deployments) {
        let lastReady: string | null = null;
        const byState: Record<string, number> = {};
        let recent = 0;
        for (const raw of depRes.data.deployments) {
          const d = raw;
          const created = deploymentCreatedMs(d);
          if (created >= fromMs) recent++;
          const st = String(d.state ?? 'unknown');
          byState[st] = (byState[st] ?? 0) + 1;
          const rs = d.readyState;
          if ((rs === 'READY' || st === 'READY') && !lastReady) lastReady = String(rs ?? st);
        }
        payload.vercel.deploymentsLast7d = recent;
        payload.vercel.deploymentsByState = byState;
        payload.vercel.latestReadyState = lastReady;
      } else if (!depRes.ok) {
        payload.vercel.deploymentsError = `Deployments API failed (${depRes.status}).`;
      }

      const { from: mtdFrom, to: mtdTo } = monthUtcRange();
      const billRes = await vercelFetchBilling(vercelToken, vercelTeamId, mtdFrom, mtdTo);

      if (billRes.ok) {
        const charges = parseJsonlBilling(billRes.text ?? '');
        const billing = aggregateBilling(charges, vercelProjectId);
        payload.vercel.billing = billing;
        const usage = extractUsageFromBreakdown(billing.breakdown, {
          invocations: limitInv,
          bandwidthGb: limitBw,
          buildMinutes: limitBuild,
        });
        payload.vercel.usage = usage;

        for (const [label, block] of [
          ['Function invocations', usage.invocations],
          ['Bandwidth (GB)', usage.bandwidthGb],
          ['Build minutes', usage.buildMinutes],
        ] as const) {
          const pct = block?.pct;
          if (pct != null && pct >= 80) {
            alerts.push({
              level: 'crit',
              source: 'vercel',
              message: `${label} at ~${pct}% of configured limit.`,
            });
          } else if (pct != null && pct >= 60) {
            alerts.push({
              level: 'warn',
              source: 'vercel',
              message: `${label} at ~${pct}% of configured limit.`,
            });
          }
        }
      } else {
        payload.vercel.billingError =
          billRes.status === 403 || billRes.status === 404
            ? 'Billing export unavailable — add VERCEL_TEAM_ID or confirm token roles include Billing.'
            : `Billing API failed (${billRes.status}).`;
      }

    } catch (e) {
      payload.vercel.error = e instanceof Error ? e.message : 'Vercel aggregate failed';
    }
  }

  /** ---------- Supabase Management ---------- */
  if (!supabaseMgmtToken || !projectRef) {
    payload.supabase.error =
      !projectRef && supabaseUrl
        ? 'Could not parse SUPABASE_PROJECT_REF from NEXT_PUBLIC_SUPABASE_URL; set SUPABASE_PROJECT_REF explicitly.'
        : !supabaseMgmtToken
          ? 'Set SUPABASE_MANAGEMENT_ACCESS_TOKEN (PAT with analytics + infra disk + optional database_read).'
          : 'Missing Supabase project ref.';
  } else {
    const headers = {
      Authorization: `Bearer ${supabaseMgmtToken}`,
      'Content-Type': 'application/json',
    };

    try {
      const diskRes = await fetch(`${SUPABASE_MGMT}/projects/${encodeURIComponent(projectRef)}/config/disk/util`, {
        headers: { Authorization: `Bearer ${supabaseMgmtToken}` },
        cache: 'no-store',
      });
      if (diskRes.ok) {
        const diskJson = (await diskRes.json()) as {
          metrics?: { fs_used_bytes?: number; fs_size_bytes?: number };
        };
        const used = diskJson.metrics?.fs_used_bytes ?? null;
        const total = diskJson.metrics?.fs_size_bytes ?? null;
        const pct =
          used != null && total != null && total > 0 ? Math.min(100, Math.round((used / total) * 1000) / 10) : null;
        payload.supabase.database = { usedBytes: used, totalBytes: total, pct };

        if (pct != null && pct >= 80) {
          alerts.push({ level: 'crit', source: 'supabase', message: `Database disk ~${pct}% full.` });
        } else if (pct != null && pct >= 60) {
          alerts.push({ level: 'warn', source: 'supabase', message: `Database disk ~${pct}% full.` });
        }
      } else {
        payload.supabase.databaseError = `disk/util (${diskRes.status})`;
      }
    } catch (e) {
      payload.supabase.databaseError = e instanceof Error ? e.message : 'disk/util failed';
    }

    try {
      const qBody = JSON.stringify({
        query: 'select count(*)::bigint as c from auth.users',
      });
      const qRes = await fetch(`${SUPABASE_MGMT}/projects/${encodeURIComponent(projectRef)}/database/query/read-only`, {
        method: 'POST',
        headers,
        body: qBody,
        cache: 'no-store',
      });
      if (qRes.ok) {
        const qJson = (await qRes.json()) as { result?: [{ c?: string | number }] };
        const c = qJson.result?.[0]?.c;
        payload.supabase.authUsers =
          typeof c === 'number' ? c : typeof c === 'string' ? Number.parseInt(c, 10) : null;
      } else {
        payload.supabase.authUsersError = `read-only query (${qRes.status})`;
      }
    } catch (e) {
      payload.supabase.authUsersError = e instanceof Error ? e.message : 'auth user count failed';
    }

    try {
      const bRes = await fetch(`${SUPABASE_MGMT}/projects/${encodeURIComponent(projectRef)}/storage/buckets`, {
        headers: { Authorization: `Bearer ${supabaseMgmtToken}` },
        cache: 'no-store',
      });
      if (bRes.ok) {
        const rows = (await bRes.json()) as { id?: string; name?: string; public?: boolean }[];
        payload.supabase.buckets = Array.isArray(rows)
          ? rows.map((r) => ({
              id: String(r.id ?? r.name ?? ''),
              name: String(r.name ?? r.id ?? ''),
              public: Boolean(r.public),
            }))
          : [];
      } else {
        payload.supabase.bucketsError = `buckets (${bRes.status})`;
      }
    } catch (e) {
      payload.supabase.bucketsError = e instanceof Error ? e.message : 'buckets failed';
    }

    try {
      const intervals = ['day', 'hour'] as const;
      let points: UsagePoint[] | null = null;
      let latestRow: {
        total_rest_requests?: number;
        total_auth_requests?: number;
        total_storage_requests?: number;
        total_realtime_requests?: number;
      } | null = null;

      for (const interval of intervals) {
        const u = new URL(`${SUPABASE_MGMT}/projects/${encodeURIComponent(projectRef)}/analytics/endpoints/usage.api-counts`);
        u.searchParams.set('interval', interval);
        const uRes = await fetch(u.toString(), {
          headers: { Authorization: `Bearer ${supabaseMgmtToken}` },
          cache: 'no-store',
        });
        if (!uRes.ok) continue;
        const uJson = (await uRes.json()) as {
          result?: {
            timestamp?: string;
            total_rest_requests?: number;
            total_auth_requests?: number;
            total_storage_requests?: number;
            total_realtime_requests?: number;
          }[];
        };
        const raw = Array.isArray(uJson.result) ? uJson.result : [];
        if (!raw.length) continue;

        const sorted = [...raw].sort((a, b) => {
          const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
          const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
          return ta - tb;
        });
        latestRow = sorted[sorted.length - 1] ?? null;

        const sevenDaysAgo = Date.now() - 7 * 86400000;
        const filtered = sorted.filter((row) => {
          const t = row.timestamp ? Date.parse(row.timestamp) : 0;
          return t >= sevenDaysAgo;
        });

        const bucket = new Map<
          string,
          { rest: number; auth: number; storage: number; realtime: number }
        >();

        const mergeIntoBucket = (label: string, row: (typeof sorted)[0]) => {
          const prev = bucket.get(label) ?? { rest: 0, auth: 0, storage: 0, realtime: 0 };
          prev.rest += Number(row.total_rest_requests ?? 0);
          prev.auth += Number(row.total_auth_requests ?? 0);
          prev.storage += Number(row.total_storage_requests ?? 0);
          prev.realtime += Number(row.total_realtime_requests ?? 0);
          bucket.set(label, prev);
        };

        const rowsForChart = filtered.length ? filtered : sorted.slice(-24);

        for (const row of rowsForChart) {
          const ts = row.timestamp ?? '';
          const label = interval === 'hour' ? ts.slice(0, 13) + ':00Z' : ts.slice(0, 10);
          mergeIntoBucket(label, row);
        }

        points = [...bucket.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([label, v]) => ({
            label,
            rest: v.rest,
            auth: v.auth,
            storage: v.storage,
            realtime: v.realtime,
          }));

        if (points.length) break;
      }

      if (points?.length) {
        payload.supabase.apiHistory = points;
      }
      if (latestRow) {
        payload.supabase.apiTotals = {
          rest: Number(latestRow.total_rest_requests ?? 0),
          auth: Number(latestRow.total_auth_requests ?? 0),
          storage: Number(latestRow.total_storage_requests ?? 0),
          realtime: Number(latestRow.total_realtime_requests ?? 0),
        };
        payload.supabase.apiTotalsNote = 'Latest analytics bucket from usage.api-counts (partial intervals possible).';
      }
    } catch (e) {
      payload.supabase.apiHistoryError = e instanceof Error ? e.message : 'usage.api-counts failed';
    }
  }

  if (!sightConfigured) {
    alerts.push({
      level: 'warn',
      source: 'sightengine',
      message: 'Image moderation may not run on Vercel without Sightengine keys.',
    });
  }

  return payload;
}
