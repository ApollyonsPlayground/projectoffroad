/**
 * Sightengine image scan (Node). Same models/thresholds as
 * `supabase/functions/scan-upload` Edge Function.
 * https://sightengine.com/docs/nsfw-detection
 *
 * We still *request* weapon/alcohol/drugs scores for visibility/audit, but we do **not**
 * auto-reject on them: the weapon model often false-flags trucks, tools, and machinery.
 */

export interface ScanResult {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  moderation_scores?: Record<string, unknown>;
}

/** Keep in sync with `supabase/functions/scan-upload/index.ts` */
export const THRESH_NUDITY_RAW = 0.58;
export const THRESH_GORE_PROB = 0.55;

const MODELS = 'nudity-2,gore-2,weapon-2,alcohol-2,drugs-2';

export type BlockReason = 'nudity_detected' | 'gore_detected';

/** Upload gate: only nudity + gore (not weapon — vehicle/truck false positives). */
export function shouldBlockCommunityImage(json: Record<string, unknown>): {
  block: boolean;
  reason?: BlockReason;
} {
  const nudity = Number((json.nudity as Record<string, unknown> | undefined)?.raw ?? 0);
  const gore = Number((json.gore as Record<string, unknown> | undefined)?.prob ?? 0);
  if (nudity > THRESH_NUDITY_RAW) return { block: true, reason: 'nudity_detected' };
  if (gore > THRESH_GORE_PROB) return { block: true, reason: 'gore_detected' };
  return { block: false };
}

export async function scanImageBuffer(buf: Buffer, mime: string): Promise<ScanResult> {
  const user = process.env.SIGHTENGINE_API_USER?.trim();
  const secret = process.env.SIGHTENGINE_API_SECRET?.trim();

  if (!user || !secret) {
    return {
      ok: true,
      skipped: true,
      reason: 'moderation_not_configured',
      moderation_scores: undefined,
    };
  }

  const form = new FormData();
  form.append('api_user', user);
  form.append('api_secret', secret);
  form.append('models', MODELS);
  const upload = new File([new Uint8Array(buf)], 'upload.jpg', {
    type: mime || 'image/jpeg',
  });
  form.append('media', upload);

  const res = await fetch('https://api.sightengine.com/1.0/check.json', {
    method: 'POST',
    body: form,
  });

  const json = (await res.json()) as Record<string, unknown>;
  const errObj = json.error as { message?: string } | undefined;

  if (!res.ok || json.status === 'failure') {
    return {
      ok: false,
      skipped: false,
      reason: String(errObj?.message ?? json.error ?? 'sightengine_error'),
      moderation_scores: json,
    };
  }

  const { block, reason } = shouldBlockCommunityImage(json);
  if (block && reason) {
    return {
      ok: false,
      skipped: false,
      reason,
      moderation_scores: json,
    };
  }

  return { ok: true, skipped: false, moderation_scores: json };
}
