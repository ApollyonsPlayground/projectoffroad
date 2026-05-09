export type StatusLevel = 'ok' | 'warn' | 'crit' | 'unknown';

export type MonitoringAlert = {
  level: Exclude<StatusLevel, 'unknown'>;
  source: 'vercel' | 'supabase' | 'sightengine';
  message: string;
};

export type UsagePoint = {
  label: string;
  rest: number;
  auth: number;
  storage: number;
  realtime: number;
};

export type BillingBreakdownRow = {
  serviceName: string;
  consumedUnit: string | null;
  consumedQuantity: number | null;
  effectiveCostUsd: number | null;
};

export type MonitoringPayload = {
  generatedAt: string;
  alerts: MonitoringAlert[];
  vercel: {
    configured: boolean;
    /** Misconfiguration (missing token / project id). */
    error?: string;
    deploymentsError?: string;
    projectId?: string;
    deploymentsLast7d?: number;
    deploymentsByState?: Record<string, number>;
    /** Latest production-ish deployment state from list (best-effort). */
    latestReadyState?: string | null;
    billing?: {
      monthToDateCostUsd: number;
      currency: string;
      /** Daily billed usage (FOCUS), month-to-date — UI may slice last 7 days for charts */
      dailyCostUsd: Array<{ day: string; usd: number }>;
      breakdown: BillingBreakdownRow[];
    };
    billingError?: string;
    usage?: {
      invocations?: { used: number; limit: number | null; pct: number | null };
      bandwidthGb?: { used: number; limit: number | null; pct: number | null };
      buildMinutes?: { used: number; limit: number | null; pct: number | null };
    };
    usageNote?: string;
  };
  supabase: {
    configured: boolean;
    error?: string;
    projectRef?: string;
    database?: {
      usedBytes: number | null;
      totalBytes: number | null;
      pct: number | null;
    };
    databaseError?: string;
    authUsers?: number | null;
    authUsersError?: string;
    buckets?: { id: string; name: string; public: boolean }[];
    bucketsError?: string;
    apiTotals?: {
      rest: number;
      auth: number;
      storage: number;
      realtime: number;
    };
    apiTotalsNote?: string;
    apiHistory?: UsagePoint[];
    apiHistoryError?: string;
    realtimeNote?: string;
  };
  sightengine: {
    configuredOnVercel: boolean;
    note: string;
  };
};
