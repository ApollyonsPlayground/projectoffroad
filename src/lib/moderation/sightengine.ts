/**
 * Sightengine image scan (Node). Same models/thresholds as
 * `supabase/functions/scan-upload` Edge Function.
 * https://sightengine.com/docs/nsfw-detection
 */

export interface ScanResult {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  moderation_scores?: Record<string, unknown>;
}

const MODELS = 'nudity-2,gore-2,weapon-2,alcohol-2,drugs-2';

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

  const nudity = Number((json.nudity as Record<string, unknown> | undefined)?.raw ?? 0);
  const gore = Number((json.gore as Record<string, unknown> | undefined)?.prob ?? 0);
  const weapons = Number((json.weapon as Record<string, unknown> | undefined)?.prob ?? 0);
  const alcohol = Number((json.alcohol as Record<string, unknown> | undefined)?.prob ?? 0);
  const drugs = Number((json.drugs as Record<string, unknown> | undefined)?.prob ?? 0);

  const isNSFW =
    nudity > 0.5 || gore > 0.5 || weapons > 0.5 || alcohol > 0.5 || drugs > 0.5;

  if (isNSFW) {
    let reason = 'content_policy';
    if (nudity > 0.5) reason = 'nudity_detected';
    else if (gore > 0.5) reason = 'gore_detected';
    return {
      ok: false,
      skipped: false,
      reason,
      moderation_scores: json,
    };
  }

  return { ok: true, skipped: false, moderation_scores: json };
}
