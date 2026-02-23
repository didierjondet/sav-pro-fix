
ALTER TABLE public.subscription_plans
ADD COLUMN storage_limit_gb numeric NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.subscription_plans.storage_limit_gb IS 'Taille de stockage allouée en GB pour ce plan';
