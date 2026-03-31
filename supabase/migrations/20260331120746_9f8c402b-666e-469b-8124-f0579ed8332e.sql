ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_country text;