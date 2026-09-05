CREATE OR REPLACE FUNCTION public.record_usage_events(_events jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _shop uuid;
  _role text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT p.shop_id, p.role::text INTO _shop, _role
  FROM public.profiles p WHERE p.user_id = _uid LIMIT 1;

  INSERT INTO public.usage_page_views (user_id, shop_id, role, path, duration_ms, device, session_id, created_at)
  SELECT _uid, _shop, _role,
         left(e->>'path', 300),
         LEAST(GREATEST(COALESCE((e->>'duration_ms')::int, 0), 0), 3600000),
         left(e->>'device', 20),
         left(e->>'session_id', 64),
         now()
  FROM jsonb_array_elements(COALESCE(_events, '[]'::jsonb)) e
  WHERE e->>'type' = 'page' AND COALESCE(e->>'path', '') <> '';

  INSERT INTO public.usage_click_events (user_id, shop_id, path, x_pct, y_pct, viewport_w, viewport_h, device, element_label, created_at)
  SELECT _uid, _shop,
         left(e->>'path', 300),
         LEAST(GREATEST(COALESCE((e->>'x_pct')::numeric, 0), 0), 100),
         LEAST(GREATEST(COALESCE((e->>'y_pct')::numeric, 0), 0), 100),
         NULLIF((e->>'viewport_w')::int, 0),
         NULLIF((e->>'viewport_h')::int, 0),
         left(e->>'device', 20),
         left(e->>'element_label', 80),
         now()
  FROM jsonb_array_elements(COALESCE(_events, '[]'::jsonb)) e
  WHERE e->>'type' = 'click' AND COALESCE(e->>'path', '') <> '';
END;
$$;

REVOKE ALL ON FUNCTION public.record_usage_events(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_usage_events(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_usage_events(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_usage_tracking_health()
RETURNS TABLE(page_views_24h bigint, clicks_24h bigint, last_page_view timestamptz, last_click timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.usage_page_views WHERE created_at > now() - interval '24 hours'),
    (SELECT count(*) FROM public.usage_click_events WHERE created_at > now() - interval '24 hours'),
    (SELECT max(created_at) FROM public.usage_page_views),
    (SELECT max(created_at) FROM public.usage_click_events)
  WHERE public.is_super_admin()
$$;

REVOKE ALL ON FUNCTION public.get_usage_tracking_health() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_usage_tracking_health() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_usage_click_labels(_path text, _days integer DEFAULT 30, _device text DEFAULT NULL)
RETURNS TABLE(element_label text, clicks bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(btrim(c.element_label), ''), '(zone sans libellé)'), count(*)::bigint
  FROM public.usage_click_events c
  WHERE public.is_super_admin()
    AND c.path = _path
    AND c.created_at > now() - (_days || ' days')::interval
    AND (_device IS NULL OR c.device = _device)
  GROUP BY 1
  ORDER BY count(*) DESC
  LIMIT 25
$$;

REVOKE ALL ON FUNCTION public.get_usage_click_labels(text, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_usage_click_labels(text, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.purge_old_usage_events()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH a AS (DELETE FROM public.usage_page_views WHERE created_at < now() - interval '12 months' RETURNING 1),
       b AS (DELETE FROM public.usage_click_events WHERE created_at < now() - interval '12 months' RETURNING 1)
  SELECT;
$$;

REVOKE ALL ON FUNCTION public.purge_old_usage_events() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_old_usage_events() FROM anon;