
-- Billing & VAT configuration per shop
CREATE TABLE IF NOT EXISTS public.shop_billing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL UNIQUE,
  vat_regime text NOT NULL DEFAULT 'standard' CHECK (vat_regime IN ('none','standard','margin')),
  vat_rate_parts numeric NOT NULL DEFAULT 20,
  vat_rate_labor numeric NOT NULL DEFAULT 20,
  prices_include_vat boolean NOT NULL DEFAULT true,
  labor_billing_enabled boolean NOT NULL DEFAULT false,
  labor_mode text NOT NULL DEFAULT 'flat' CHECK (labor_mode IN ('flat','hourly')),
  labor_hourly_rate numeric NOT NULL DEFAULT 60,
  labor_label text NOT NULL DEFAULT 'Main d''œuvre',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_billing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view billing config"
ON public.shop_billing_config FOR SELECT
TO authenticated
USING (shop_id = get_current_user_shop_id() OR is_super_admin());

CREATE POLICY "Shop admins can insert billing config"
ON public.shop_billing_config FOR INSERT
TO authenticated
WITH CHECK ((shop_id = get_current_user_shop_id() AND is_shop_admin()) OR is_super_admin());

CREATE POLICY "Shop admins can update billing config"
ON public.shop_billing_config FOR UPDATE
TO authenticated
USING ((shop_id = get_current_user_shop_id() AND is_shop_admin()) OR is_super_admin())
WITH CHECK ((shop_id = get_current_user_shop_id() AND is_shop_admin()) OR is_super_admin());

CREATE POLICY "Super admins can delete billing config"
ON public.shop_billing_config FOR DELETE
TO authenticated
USING (is_super_admin());

CREATE TRIGGER trg_shop_billing_config_updated_at
BEFORE UPDATE ON public.shop_billing_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-part labor override (used in flat mode, or override of hourly calc)
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS labor_cost numeric;
