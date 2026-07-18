
ALTER TABLE public.sav_cases ADD COLUMN IF NOT EXISTS ai_diagnostic TEXT;
ALTER TABLE public.sav_cases ADD COLUMN IF NOT EXISTS ai_diagnostic_generated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.sav_diagnostic_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sav_case_id UUID NOT NULL REFERENCES public.sav_cases(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sav_diagnostic_messages_case ON public.sav_diagnostic_messages(sav_case_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sav_diagnostic_messages TO authenticated;
GRANT ALL ON public.sav_diagnostic_messages TO service_role;

ALTER TABLE public.sav_diagnostic_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read diagnostic messages of their shop"
ON public.sav_diagnostic_messages FOR SELECT
TO authenticated
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert diagnostic messages in their shop"
ON public.sav_diagnostic_messages FOR INSERT
TO authenticated
WITH CHECK (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete diagnostic messages of their shop"
ON public.sav_diagnostic_messages FOR DELETE
TO authenticated
USING (
  shop_id IN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid())
);
