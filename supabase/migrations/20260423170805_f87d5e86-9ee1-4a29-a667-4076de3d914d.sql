-- Create global settings table
CREATE TABLE IF NOT EXISTS public.app_global_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_global_settings ENABLE ROW LEVEL SECURITY;

-- Public read access (needed by landing for unauthenticated visitors)
CREATE POLICY "Anyone can read global settings"
ON public.app_global_settings
FOR SELECT
USING (true);

-- Super admin write
CREATE POLICY "Super admins can insert global settings"
ON public.app_global_settings
FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update global settings"
ON public.app_global_settings
FOR UPDATE
USING (is_super_admin());

CREATE POLICY "Super admins can delete global settings"
ON public.app_global_settings
FOR DELETE
USING (is_super_admin());

-- Auto update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_app_global_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_app_global_settings_updated_at
BEFORE UPDATE ON public.app_global_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_app_global_settings_updated_at();

-- Seed default value
INSERT INTO public.app_global_settings (key, value)
VALUES ('prospect_redirect_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;