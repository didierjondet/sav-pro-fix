CREATE TABLE public.product_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_families TO authenticated;
GRANT ALL ON public.product_families TO service_role;
ALTER TABLE public.product_families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop members view families" ON public.product_families FOR SELECT TO authenticated USING (shop_id = get_current_user_shop_id() OR is_super_admin());
CREATE POLICY "Shop members insert families" ON public.product_families FOR INSERT TO authenticated WITH CHECK (shop_id = get_current_user_shop_id() OR is_super_admin());
CREATE POLICY "Shop members update families" ON public.product_families FOR UPDATE TO authenticated USING (shop_id = get_current_user_shop_id() OR is_super_admin());
CREATE POLICY "Shop members delete families" ON public.product_families FOR DELETE TO authenticated USING (shop_id = get_current_user_shop_id() OR is_super_admin());
CREATE INDEX idx_product_families_shop ON public.product_families(shop_id);
CREATE TRIGGER trg_product_families_updated BEFORE UPDATE ON public.product_families FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.sav_cases ADD COLUMN product_family_id uuid REFERENCES public.product_families(id) ON DELETE SET NULL;
CREATE INDEX idx_sav_cases_product_family ON public.sav_cases(product_family_id);