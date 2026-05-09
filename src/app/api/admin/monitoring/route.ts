import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/verifyRequest';
import { buildMonitoringPayload } from '@/lib/admin/monitoring/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const payload = await buildMonitoringPayload();
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Monitoring aggregate failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
