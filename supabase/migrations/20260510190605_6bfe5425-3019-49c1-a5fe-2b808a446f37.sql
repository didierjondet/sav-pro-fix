ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS collect_technician_initials boolean NOT NULL DEFAULT false;
ALTER TABLE public.sav_cases ADD COLUMN IF NOT EXISTS taken_over_by text;