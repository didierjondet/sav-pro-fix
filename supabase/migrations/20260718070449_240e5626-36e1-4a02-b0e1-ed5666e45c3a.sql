CREATE TABLE public.sav_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sav_case_id UUID NOT NULL REFERENCES public.sav_cases(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  certificate_type TEXT NOT NULL DEFAULT 'non_repairability',
  title TEXT,
  content TEXT NOT NULL,
  snapshot JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sav_certificates TO authenticated;
GRANT ALL ON public.sav_certificates TO service_role;

ALTER TABLE public.sav_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view certificates"
  ON public.sav_certificates FOR SELECT TO authenticated
  USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

CREATE POLICY "Shop members can insert certificates"
  ON public.sav_certificates FOR INSERT TO authenticated
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Shop members can update certificates"
  ON public.sav_certificates FOR UPDATE TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Shop members can delete certificates"
  ON public.sav_certificates FOR DELETE TO authenticated
  USING (shop_id = public.get_current_user_shop_id());

CREATE TRIGGER update_sav_certificates_updated_at
  BEFORE UPDATE ON public.sav_certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sav_certificates_sav_case ON public.sav_certificates(sav_case_id, created_at DESC);