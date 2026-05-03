/**
 * Direct Sightengine upload (Node). Production posts use Supabase Edge `scan-upload` instead;
 * this helper remains useful for scripts/tests.
 * https://sightengine.com/docs/nsfw-detection
 */

export interface ScanResult {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  rawScores?: Record<string, unknown>;
}

export async function scanImageBuffer(buf: Buffer, mime: string): Promise<ScanResult> {
  const user = process.env.SIGHTENGINE_API_USER?.trim();
  const secret = process.env.SIGHTENGINE_API_SECRET?.trim();

  if (!user || !secret) {
    return { ok: true, skipped: true, reason: 'moderation_not_configured' };
  }

  const form = new FormData();
  form.set('api_user', user);
  form.set('api_secret', secret);
  form.set('models', 'nudity');
  const file = new File([new Uint8Array(buf)], 'upload.jpg', {
    type: mime || 'image/jpeg',
  });
  form.set('media', file);

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
      rawScores: json,
    };
  }

  const nudity = json.nudity as Record<string, number> | undefined;
  if (!nudity) {
    return { ok: true, skipped: false, rawScores: json };
  }

  const raw = nudity.raw ?? 0;
  const partial = nudity.partial ?? 0;
  const sexual = nudity.sexual_activity ?? nudity.sexual ?? 0;

  const blockScore = Math.max(raw, partial * 0.85, sexual * 0.9);

  if (blockScore > 0.82) {
    return {
      ok: false,
      skipped: false,
      reason: 'nudity_detected',
      rawScores: json,
    };
  }

  return { ok: true, skipped: false, rawScores: json };
}
