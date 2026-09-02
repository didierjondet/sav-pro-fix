-- 1. MFA backup codes
CREATE TABLE public.user_mfa_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_mfa_backup_codes TO authenticated;
GRANT ALL ON public.user_mfa_backup_codes TO service_role;
ALTER TABLE public.user_mfa_backup_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own backup codes" ON public.user_mfa_backup_codes
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_mfa_backup_user ON public.user_mfa_backup_codes(user_id);

-- 2. Page views
CREATE TABLE public.usage_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  shop_id uuid,
  role text,
  path text NOT NULL,
  duration_ms integer NOT NULL DEFAULT 0,
  device text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.usage_page_views TO authenticated;
GRANT ALL ON public.usage_page_views TO service_role;
ALTER TABLE public.usage_page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own page views" ON public.usage_page_views
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "super admin reads page views" ON public.usage_page_views
  FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE INDEX idx_usage_pv_created ON public.usage_page_views(created_at DESC);
CREATE INDEX idx_usage_pv_path ON public.usage_page_views(path);
CREATE INDEX idx_usage_pv_user ON public.usage_page_views(user_id);

-- 3. Click events (heatmap)
CREATE TABLE public.usage_click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  shop_id uuid,
  path text NOT NULL,
  x_pct numeric(6,3) NOT NULL,
  y_pct numeric(6,3) NOT NULL,
  viewport_w integer,
  viewport_h integer,
  device text,
  element_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.usage_click_events TO authenticated;
GRANT ALL ON public.usage_click_events TO service_role;
ALTER TABLE public.usage_click_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own clicks" ON public.usage_click_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "super admin reads clicks" ON public.usage_click_events
  FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE INDEX idx_usage_click_path ON public.usage_click_events(path, created_at DESC);

-- 4. Global setting for enforcing MFA to everyone (later)
INSERT INTO public.app_global_settings (key, value)
VALUES ('mfa_required_for_all', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. Stats functions (super admin only)
CREATE OR REPLACE FUNCTION public.get_usage_page_stats(_days integer DEFAULT 30)
RETURNS TABLE(path text, views bigint, unique_users bigint, avg_seconds numeric, total_seconds numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.path,
         count(*)::bigint,
         count(DISTINCT v.user_id)::bigint,
         round(avg(v.duration_ms)/1000.0, 1),
         round(sum(v.duration_ms)/1000.0, 0)
  FROM public.usage_page_views v
  WHERE public.is_super_admin()
    AND v.created_at > now() - (_days || ' days')::interval
  GROUP BY v.path
  ORDER BY count(*) DESC
$$;

CREATE OR REPLACE FUNCTION public.get_usage_heatmap(_path text, _days integer DEFAULT 30, _device text DEFAULT NULL)
RETURNS TABLE(x_pct numeric, y_pct numeric, weight bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT round(c.x_pct, 1), round(c.y_pct, 1), count(*)::bigint
  FROM public.usage_click_events c
  WHERE public.is_super_admin()
    AND c.path = _path
    AND c.created_at > now() - (_days || ' days')::interval
    AND (_device IS NULL OR c.device = _device)
  GROUP BY 1, 2
$$;

CREATE OR REPLACE FUNCTION public.get_signup_activation_report()
RETURNS TABLE(
  user_id uuid, email text, first_name text, last_name text, role text,
  shop_id uuid, shop_name text, signed_up_at timestamptz, last_sign_in_at timestamptz,
  sav_count bigint, customer_count bigint, page_views bigint, total_seconds numeric,
  last_path text, activation_status text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email::text, p.first_name, p.last_name, p.role::text,
         s.id, s.name, u.created_at, u.last_sign_in_at,
         COALESCE(sc.n, 0), COALESCE(cc.n, 0),
         COALESCE(pv.n, 0), COALESCE(round(pv.secs, 0), 0),
         pv.last_path,
         CASE
           WHEN u.last_sign_in_at IS NULL THEN 'jamais_connecte'
           WHEN COALESCE(sc.n, 0) = 0 AND COALESCE(cc.n, 0) = 0 THEN 'connecte_sans_action'
           WHEN COALESCE(sc.n, 0) < 5 THEN 'a_teste'
           ELSE 'actif'
         END
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.shops s ON s.id = p.shop_id
  LEFT JOIN LATERAL (SELECT count(*) n FROM public.sav_cases c WHERE c.shop_id = p.shop_id) sc ON true
  LEFT JOIN LATERAL (SELECT count(*) n FROM public.customers cu WHERE cu.shop_id = p.shop_id) cc ON true
  LEFT JOIN LATERAL (
    SELECT count(*) n, sum(v.duration_ms)/1000.0 secs,
           (SELECT v2.path FROM public.usage_page_views v2 WHERE v2.user_id = u.id ORDER BY v2.created_at DESC LIMIT 1) last_path
    FROM public.usage_page_views v WHERE v.user_id = u.id
  ) pv ON true
  WHERE public.is_super_admin()
  ORDER BY u.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.get_usage_page_stats(integer) FROM anon;
REVOKE ALL ON FUNCTION public.get_usage_heatmap(text, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.get_signup_activation_report() FROM anon;