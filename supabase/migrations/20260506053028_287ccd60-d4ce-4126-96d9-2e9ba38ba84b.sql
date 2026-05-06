ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS is_service boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_parts_is_service ON public.parts(is_service);