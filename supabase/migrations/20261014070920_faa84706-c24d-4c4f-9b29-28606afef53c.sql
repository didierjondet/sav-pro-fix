CREATE TABLE public.mobile_sav_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18),'hex'),
  shop_id uuid NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  status text NOT NULL DEFAULT 'waiting',
  sav_case_id uuid,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobile_sav_sessions TO authenticated;
GRANT ALL ON public.mobile_sav_sessions TO service_role;
ALTER TABLE public.mobile_sav_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mss same shop select" ON public.mobile_sav_sessions FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "mss same shop insert" ON public.mobile_sav_sessions FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id() AND created_by = auth.uid());
CREATE POLICY "mss same shop update" ON public.mobile_sav_sessions FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "mss same shop delete" ON public.mobile_sav_sessions FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE OR REPLACE FUNCTION public.mss_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER mss_touch BEFORE UPDATE ON public.mobile_sav_sessions FOR EACH ROW EXECUTE FUNCTION public.mss_touch();
ALTER PUBLICATION supabase_realtime ADD TABLE public.mobile_sav_sessions;