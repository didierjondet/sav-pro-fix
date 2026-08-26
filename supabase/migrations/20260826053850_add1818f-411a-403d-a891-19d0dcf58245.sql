CREATE TABLE public.shop_sav_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  specialties TEXT,
  avg_delay_days INTEGER,
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_in_sidebar BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_sav_providers TO authenticated;
GRANT ALL ON public.shop_sav_providers TO service_role;

ALTER TABLE public.shop_sav_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view their providers"
ON public.shop_sav_providers FOR SELECT TO authenticated
USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

CREATE POLICY "Shop members can insert their providers"
ON public.shop_sav_providers FOR INSERT TO authenticated
WITH CHECK (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

CREATE POLICY "Shop members can update their providers"
ON public.shop_sav_providers FOR UPDATE TO authenticated
USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin())
WITH CHECK (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

CREATE POLICY "Shop members can delete their providers"
ON public.shop_sav_providers FOR DELETE TO authenticated
USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

CREATE TABLE public.sav_provider_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  sav_case_id UUID NOT NULL REFERENCES public.sav_cases(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.shop_sav_providers(id) ON DELETE RESTRICT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  returned_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  external_ref TEXT,
  cost NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_sav_provider_assignments_case ON public.sav_provider_assignments(sav_case_id);
CREATE INDEX idx_sav_provider_assignments_shop_active ON public.sav_provider_assignments(shop_id) WHERE returned_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sav_provider_assignments TO authenticated;
GRANT ALL ON public.sav_provider_assignments TO service_role;

ALTER TABLE public.sav_provider_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view their assignments"
ON public.sav_provider_assignments FOR SELECT TO authenticated
USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

CREATE POLICY "Shop members can insert their assignments"
ON public.sav_provider_assignments FOR INSERT TO authenticated
WITH CHECK (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

CREATE POLICY "Shop members can update their assignments"
ON public.sav_provider_assignments FOR UPDATE TO authenticated
USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin())
WITH CHECK (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

CREATE POLICY "Shop members can delete their assignments"
ON public.sav_provider_assignments FOR DELETE TO authenticated
USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

CREATE TRIGGER update_shop_sav_providers_updated_at
BEFORE UPDATE ON public.shop_sav_providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sav_provider_assignments_updated_at
BEFORE UPDATE ON public.sav_provider_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();