-- Create table for Twilio alert configuration
CREATE TABLE IF NOT EXISTS public.twilio_alert_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_sms integer NOT NULL DEFAULT 100,
  alert_phone text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.twilio_alert_config ENABLE ROW LEVEL SECURITY;

-- Super admins can manage alert config
CREATE POLICY "super_admin_manage_twilio_alert_config"
ON public.twilio_alert_config
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Insert default configuration
INSERT INTO public.twilio_alert_config (id, threshold_sms, alert_phone, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 100, '', true)
ON CONFLICT (id) DO NOTHING;