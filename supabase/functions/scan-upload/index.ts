/**
 * Pre-upload image scan: multipart field "file", Authorization Bearer user JWT.
 * Uses Sightengine secrets stored only on Supabase (SIGHTENGINE_API_USER / SIGHTENGINE_API_SECRET).
 * Models/thresholds aligned with supabase/functions/moderate-image webhook.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const MAX_BYTES = 12 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
    const authHeader = req.headers.get('Authorization');

    if (!supabaseUrl || !anonKey || !authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const seUser = Deno.env.get('SIGHTENGINE_API_USER')?.trim();
    const seSecret = Deno.env.get('SIGHTENGINE_API_SECRET')?.trim();
    if (!seUser || !seSecret) {
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          moderation_scores: null,
          reason: 'moderation_not_configured',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return new Response(JSON.stringify({ error: 'Expected multipart form data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawFile = form.get('file');
    const file =
      rawFile instanceof File
        ? rawFile
        : rawFile instanceof Blob
          ? rawFile
          : null;
    if (!file || file.size === 0) {
      return new Response(JSON.stringify({ error: 'Missing file field' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (file.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'File too large' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const out = new FormData();
    out.append('api_user', seUser);
    out.append('api_secret', seSecret);
    out.append('models', 'nudity-2,gore-2,weapon-2,alcohol-2,drugs-2');
    out.append('media', file);

    const seRes = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: out,
    });

    const json = (await seRes.json()) as Record<string, unknown>;
    if (!seRes.ok || json.status === 'failure') {
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: 'sightengine_api_error',
          moderation_scores: json,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Thresholds + rules: keep in sync with src/lib/moderation/sightengine.ts
    // We request weapon/alcohol/drugs for audit only — weapon often false-flags trucks/vehicles.
    const THRESH_NUDITY_RAW = 0.58;
    const THRESH_GORE_PROB = 0.65;

    const nudity = Number(
      (json.nudity as Record<string, unknown> | undefined)?.raw ?? 0,
    );
    const gore = Number(
      (json.gore as Record<string, unknown> | undefined)?.prob ?? 0,
    );

    const blockNudity = nudity > THRESH_NUDITY_RAW;
    const blockGore = gore > THRESH_GORE_PROB;

    if (blockNudity || blockGore) {
      const reason = blockNudity ? 'nudity_detected' : 'gore_detected';
      return new Response(
        JSON.stringify({
          ok: false,
          reason,
          moderation_scores: json,
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, skipped: false, moderation_scores: json }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[scan-upload]', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
