ALTER TABLE public.shop_sav_types
ADD COLUMN IF NOT EXISTS enable_restitution_pdf BOOLEAN NOT NULL DEFAULT true;