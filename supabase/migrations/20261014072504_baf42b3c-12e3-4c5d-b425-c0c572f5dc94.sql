ALTER TABLE public.mobile_sav_sessions ADD COLUMN IF NOT EXISTS payload jsonb;

CREATE OR REPLACE FUNCTION public.mobile_sav_open(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.mobile_sav_sessions;
BEGIN
  SELECT * INTO s FROM public.mobile_sav_sessions WHERE token = p_token;
  IF NOT FOUND OR s.status IN ('submitted','expired') OR s.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  IF s.status = 'waiting' THEN
    UPDATE public.mobile_sav_sessions SET status = 'connected' WHERE id = s.id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'expires_at', s.expires_at);
END; $$;

CREATE OR REPLACE FUNCTION public.mobile_sav_submit(p_token text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.mobile_sav_sessions; clean jsonb;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' OR length(p_payload::text) > 20000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;
  SELECT * INTO s FROM public.mobile_sav_sessions WHERE token = p_token FOR UPDATE;
  IF NOT FOUND OR s.status IN ('submitted','expired') OR s.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb) INTO clean
  FROM jsonb_each(p_payload)
  WHERE key IN ('brand','model','imei','sku','color','grade','photos','problem','accessories','unlock_code','no_code');
  UPDATE public.mobile_sav_sessions SET payload = clean, status = 'submitted' WHERE id = s.id;
  RETURN jsonb_build_object('ok', true);
END; $$;

REVOKE ALL ON FUNCTION public.mobile_sav_open(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mobile_sav_submit(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mobile_sav_open(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mobile_sav_submit(text, jsonb) TO anon, authenticated;