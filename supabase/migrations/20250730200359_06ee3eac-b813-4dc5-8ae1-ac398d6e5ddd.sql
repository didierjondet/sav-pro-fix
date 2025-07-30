-- Create table for SMS pricing by subscription tier
CREATE TABLE public.sms_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_tier TEXT NOT NULL UNIQUE,
  price_per_sms DECIMAL(10,4) NOT NULL DEFAULT 0.10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN ('free', 'premium', 'enterprise'))
);

-- Insert default pricing for each tier
INSERT INTO public.sms_pricing (subscription_tier, price_per_sms) VALUES
('free', 0.12),        -- 12 centimes par SMS pour le plan gratuit
('premium', 0.08),     -- 8 centimes par SMS pour le plan premium  
('enterprise', 0.05);  -- 5 centimes par SMS pour le plan enterprise

-- Enable Row Level Security
ALTER TABLE public.sms_pricing ENABLE ROW LEVEL SECURITY;

-- Create policy for super admins to manage SMS pricing
CREATE POLICY "Super admins can manage SMS pricing" 
ON public.sms_pricing 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Create policy for authenticated users to view SMS pricing
CREATE POLICY "Users can view SMS pricing"
ON public.sms_pricing
FOR SELECT
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sms_pricing_updated_at
BEFORE UPDATE ON public.sms_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();