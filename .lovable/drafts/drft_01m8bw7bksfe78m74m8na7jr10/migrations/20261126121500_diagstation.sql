CREATE TABLE public.diagnostic_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.diagnostic_api_keys TO authenticated;
GRANT ALL ON public.diagnostic_api_keys TO service_role;
ALTER TABLE public.diagnostic_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diag keys read own shop" ON public.diagnostic_api_keys FOR SELECT TO authenticated
  USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "diag keys insert own shop" ON public.diagnostic_api_keys FOR INSERT TO authenticated
  WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "diag keys revoke own shop" ON public.diagnostic_api_keys FOR UPDATE TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE INDEX idx_diag_keys_shop ON public.diagnostic_api_keys(shop_id);

CREATE TABLE public.device_diagnostics (
  id text PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  sav_case_id uuid REFERENCES public.sav_cases(id) ON DELETE SET NULL,
  public_token text NOT NULL UNIQUE,
  platform text, brand text, model text, serial text, imei text, os text,
  grade text, score int, pass_count int, fail_count int,
  failed_tests text[] NOT NULL DEFAULT '{}',
  customer_name text, customer_ticket text, technician text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.device_diagnostics TO authenticated;
GRANT ALL ON public.device_diagnostics TO service_role;
ALTER TABLE public.device_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diag read own shop" ON public.device_diagnostics FOR SELECT TO authenticated
  USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "diag delete own shop" ON public.device_diagnostics FOR DELETE TO authenticated
  USING (shop_id = public.get_current_user_shop_id());
-- manual link to a SAV of the same shop
CREATE POLICY "diag link own shop" ON public.device_diagnostics FOR UPDATE TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id()
    AND (sav_case_id IS NULL OR EXISTS (SELECT 1 FROM public.sav_cases s WHERE s.id = sav_case_id AND s.shop_id = device_diagnostics.shop_id)));
CREATE INDEX idx_device_diag_imei ON public.device_diagnostics(imei);
CREATE INDEX idx_device_diag_serial ON public.device_diagnostics(serial);
CREATE INDEX idx_device_diag_shop ON public.device_diagnostics(shop_id);
CREATE INDEX idx_device_diag_sav ON public.device_diagnostics(sav_case_id);

CREATE OR REPLACE FUNCTION public.get_public_diagnostic(p_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', d.id, 'created_at', d.created_at, 'grade', d.grade, 'score', d.score,
    'technician', d.technician, 'ticket', d.customer_ticket,
    'payload', (d.payload - 'customer'),
    'shop', jsonb_build_object('name', s.name, 'logo_url', s.logo_url, 'address', s.address, 'phone', s.phone)
  )
  FROM public.device_diagnostics d JOIN public.shops s ON s.id = d.shop_id
  WHERE p_token IS NOT NULL AND length(p_token) >= 24 AND d.public_token = p_token
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_public_diagnostic(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_diagnostic(text) TO anon, authenticated;
