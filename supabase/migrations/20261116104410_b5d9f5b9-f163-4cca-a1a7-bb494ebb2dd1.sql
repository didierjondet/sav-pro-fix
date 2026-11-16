CREATE TABLE public.onboarding_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.onboarding_feedback TO authenticated;
GRANT ALL ON public.onboarding_feedback TO service_role;
ALTER TABLE public.onboarding_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insert" ON public.onboarding_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND kind IN ('signup','blocker') AND (shop_id IS NULL OR shop_id = public.get_current_user_shop_id()));
CREATE POLICY "own or super admin read" ON public.onboarding_feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin());
CREATE INDEX ON public.onboarding_feedback(shop_id);

CREATE OR REPLACE FUNCTION public.get_activation_funnel()
RETURNS TABLE(shop_id uuid, shop_name text, created_at timestamptz, owner_email text,
  customers bigint, savs bigint, quotes bigint, sms bigint,
  last_sign_in_at timestamptz, returned_d1 boolean, returned_d7 boolean, subscribed boolean, tier text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT s.id, s.name, s.created_at, own.email,
    (SELECT count(*) FROM customers c WHERE c.shop_id=s.id),
    (SELECT count(*) FROM sav_cases c WHERE c.shop_id=s.id),
    (SELECT count(*) FROM quotes q WHERE q.shop_id=s.id),
    (SELECT count(*) FROM sms_history h WHERE h.shop_id=s.id),
    act.last_in,
    COALESCE(act.last_in > s.created_at + interval '1 day', false),
    COALESCE(act.last_in > s.created_at + interval '7 days', false),
    EXISTS (SELECT 1 FROM subscribers sb JOIN profiles p ON p.user_id=sb.user_id WHERE p.shop_id=s.id AND sb.subscribed),
    s.subscription_tier
  FROM shops s
  LEFT JOIN LATERAL (SELECT max(u.last_sign_in_at) last_in FROM profiles p JOIN auth.users u ON u.id=p.user_id WHERE p.shop_id=s.id) act ON true
  LEFT JOIN LATERAL (SELECT u.email::text email FROM profiles p JOIN auth.users u ON u.id=p.user_id WHERE p.shop_id=s.id ORDER BY u.created_at LIMIT 1) own ON true
  WHERE public.is_super_admin()
  ORDER BY s.created_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.get_activation_funnel() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_activation_funnel() TO authenticated;