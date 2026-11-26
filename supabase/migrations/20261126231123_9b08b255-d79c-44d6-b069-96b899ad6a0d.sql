CREATE TABLE public.controller_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_by uuid DEFAULT auth.uid(),
  brand text, model text, serial text,
  report jsonb NOT NULL,
  sav_case_id uuid REFERENCES public.sav_cases(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX controller_tests_shop_idx ON public.controller_tests(shop_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.controller_tests TO authenticated;
GRANT ALL ON public.controller_tests TO service_role;
ALTER TABLE public.controller_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop members manage controller tests" ON public.controller_tests FOR ALL TO authenticated
USING (shop_id = public.get_current_user_shop_id())
WITH CHECK (shop_id = public.get_current_user_shop_id());