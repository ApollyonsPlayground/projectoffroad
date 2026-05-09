-- Per-minute rate limits for POST /api/caelum/chat (service role only via RPC).

CREATE TABLE IF NOT EXISTS public.caelum_chat_rate_limits (
  bucket_key text NOT NULL,
  minute_epoch bigint NOT NULL,
  count integer NOT NULL DEFAULT 0,
  CONSTRAINT caelum_chat_rate_limits_pkey PRIMARY KEY (bucket_key, minute_epoch)
);

COMMENT ON TABLE public.caelum_chat_rate_limits IS 'Server-side Ask Caelum chat rate limit buckets; accessed only via caelum_chat_rate_touch.';

ALTER TABLE public.caelum_chat_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY caelum_chat_rate_limits_deny_clients
  ON public.caelum_chat_rate_limits FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.caelum_chat_rate_touch(p_bucket text, p_max integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_min bigint := floor(extract(epoch from now()) / 60)::bigint;
  new_count integer;
BEGIN
  INSERT INTO public.caelum_chat_rate_limits (bucket_key, minute_epoch, count)
  VALUES (p_bucket, cur_min, 1)
  ON CONFLICT (bucket_key, minute_epoch)
  DO UPDATE SET count = public.caelum_chat_rate_limits.count + 1
  RETURNING count INTO new_count;

  RETURN jsonb_build_object(
    'allowed', new_count <= p_max,
    'count', new_count,
    'minute_epoch', cur_min
  );
END;
$$;

COMMENT ON FUNCTION public.caelum_chat_rate_touch(text, integer) IS 'Atomically increment chat sends per UTC minute bucket; returns allowed=false when count exceeds p_max.';

REVOKE ALL ON FUNCTION public.caelum_chat_rate_touch(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.caelum_chat_rate_touch(text, integer) TO service_role;
