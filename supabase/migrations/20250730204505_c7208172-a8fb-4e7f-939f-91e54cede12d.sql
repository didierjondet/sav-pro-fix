-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL DEFAULT 0,
  sav_limit INTEGER,
  sms_limit INTEGER,
  sms_cost NUMERIC NOT NULL DEFAULT 0.10,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins can manage subscription plans" 
ON public.subscription_plans 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Users can view subscription plans" 
ON public.subscription_plans 
FOR SELECT 
USING (true);

-- Insert default plans
INSERT INTO public.subscription_plans (name, price, sav_limit, sms_limit, sms_cost, features) VALUES
('Gratuit', 0, 15, 15, 0.12, '["15 SAV actifs", "15 SMS/mois", "Support par email"]'::jsonb),
('Premium', 29, 10, 100, 0.10, '["10 SAV simultanés", "100 SMS/mois", "Support prioritaire", "Site web personnalisé"]'::jsonb),
('Enterprise', 99, NULL, 400, 0.08, '["SAV illimités", "400 SMS/mois", "Support dédié", "Site web premium", "Intégrations avancées"]'::jsonb);

-- Create trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Drop old sms_pricing table if it exists
DROP TABLE IF EXISTS public.sms_pricing;