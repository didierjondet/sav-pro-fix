-- Create subscribers table to track subscription information
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT DEFAULT 'free',
  subscription_end TIMESTAMPTZ,
  sms_credits_used INTEGER DEFAULT 0,
  active_sav_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own subscription info
CREATE POLICY "select_own_subscription" ON public.subscribers
FOR SELECT
USING (user_id = auth.uid() OR email = auth.email());

-- Create policy for edge functions to update subscription info
CREATE POLICY "update_own_subscription" ON public.subscribers
FOR UPDATE
USING (true);

-- Create policy for edge functions to insert subscription info
CREATE POLICY "insert_subscription" ON public.subscribers
FOR INSERT
WITH CHECK (true);

-- Add subscription-related columns to shops table
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS sms_credits_allocated INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS sms_credits_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_sav_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ;

-- Create global SMS credits table for super admin management
CREATE TABLE public.global_sms_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_credits INTEGER DEFAULT 0,
  used_credits INTEGER DEFAULT 0,
  remaining_credits INTEGER GENERATED ALWAYS AS (total_credits - used_credits) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert initial row for global SMS management
INSERT INTO public.global_sms_credits (total_credits, used_credits) VALUES (10000, 0);

-- Enable RLS for global SMS credits
ALTER TABLE public.global_sms_credits ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage global SMS credits
CREATE POLICY "super_admin_manage_global_sms" ON public.global_sms_credits
FOR ALL
USING (is_super_admin());

-- Function to update active SAV count
CREATE OR REPLACE FUNCTION update_active_sav_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the active SAV count for the shop
  UPDATE public.shops 
  SET active_sav_count = (
    SELECT COUNT(*) 
    FROM public.sav_cases 
    WHERE shop_id = COALESCE(NEW.shop_id, OLD.shop_id) 
    AND status NOT IN ('completed', 'cancelled')
  )
  WHERE id = COALESCE(NEW.shop_id, OLD.shop_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for SAV count updates
CREATE TRIGGER update_sav_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.sav_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_active_sav_count();

-- Function to check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limits(p_shop_id UUID)
RETURNS jsonb AS $$
DECLARE
  shop_record RECORD;
  result jsonb;
BEGIN
  SELECT * INTO shop_record FROM public.shops WHERE id = p_shop_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Shop not found');
  END IF;
  
  -- Check limits based on subscription tier
  CASE shop_record.subscription_tier
    WHEN 'free' THEN
      IF shop_record.active_sav_count >= 15 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Free plan limited to 15 active SAV cases');
      END IF;
      IF shop_record.sms_credits_used >= 15 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Free plan limited to 15 SMS per month');
      END IF;
    WHEN 'premium' THEN
      IF shop_record.active_sav_count >= 10 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Premium plan limited to 10 simultaneous SAV cases');
      END IF;
      IF shop_record.sms_credits_used >= 100 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Premium plan limited to 100 SMS per month');
      END IF;
    WHEN 'enterprise' THEN
      IF shop_record.sms_credits_used >= 400 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Enterprise plan limited to 400 SMS per month');
      END IF;
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'Invalid subscription tier');
  END CASE;
  
  RETURN jsonb_build_object('allowed', true, 'reason', 'Within limits');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly SMS credits (to be called by cron job)
CREATE OR REPLACE FUNCTION reset_monthly_sms_credits()
RETURNS void AS $$
BEGIN
  UPDATE public.shops SET sms_credits_used = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;