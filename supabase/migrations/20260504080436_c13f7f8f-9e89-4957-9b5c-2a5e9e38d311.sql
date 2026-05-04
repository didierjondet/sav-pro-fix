
CREATE TABLE public.shop_onboarding_progress (
  shop_id UUID PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  steps_seen JSONB NOT NULL DEFAULT '[]'::jsonb,
  dismissed_until TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view their onboarding progress"
ON public.shop_onboarding_progress
FOR SELECT
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Shop admins can insert their onboarding progress"
ON public.shop_onboarding_progress
FOR INSERT
WITH CHECK (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin','shop_admin','super_admin'))
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Shop admins can update their onboarding progress"
ON public.shop_onboarding_progress
FOR UPDATE
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin','shop_admin','super_admin'))
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);

CREATE TRIGGER update_shop_onboarding_progress_updated_at
BEFORE UPDATE ON public.shop_onboarding_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
