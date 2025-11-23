-- Create daily_assistant_config table
CREATE TABLE IF NOT EXISTS public.daily_assistant_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  sav_statuses_included text[] DEFAULT ARRAY['pending', 'in_progress', 'parts_ordered', 'testing'],
  sav_types_included text[] DEFAULT NULL, -- NULL = tous les types
  min_sav_age_days integer DEFAULT 0,
  late_threshold_days integer DEFAULT 3,
  low_stock_threshold integer DEFAULT 5,
  analysis_priority text DEFAULT 'balanced' CHECK (analysis_priority IN ('revenue', 'satisfaction', 'productivity', 'balanced')),
  tone text DEFAULT 'professional' CHECK (tone IN ('professional', 'motivating', 'concise', 'detailed')),
  sections_enabled jsonb DEFAULT '{"daily_priorities": true, "quick_actions": true, "parts_management": true, "productivity_tips": true, "revenue_optimization": true}'::jsonb,
  top_items_count integer DEFAULT 5 CHECK (top_items_count BETWEEN 1 AND 20),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(shop_id)
);

-- Enable RLS
ALTER TABLE public.daily_assistant_config ENABLE ROW LEVEL SECURITY;

-- Policy: Shop users can view their config
CREATE POLICY "Shop users can view their daily assistant config"
ON public.daily_assistant_config FOR SELECT
TO authenticated
USING (shop_id = get_current_user_shop_id());

-- Policy: Shop admins can insert config
CREATE POLICY "Shop admins can insert daily assistant config"
ON public.daily_assistant_config FOR INSERT
TO authenticated
WITH CHECK (
  shop_id = get_current_user_shop_id() 
  AND is_shop_admin()
);

-- Policy: Shop admins can update config
CREATE POLICY "Shop admins can update daily assistant config"
ON public.daily_assistant_config FOR UPDATE
TO authenticated
USING (shop_id = get_current_user_shop_id() AND is_shop_admin());

-- Policy: Super admins can manage all configs
CREATE POLICY "Super admins can manage all daily assistant configs"
ON public.daily_assistant_config FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Create updated_at trigger
CREATE TRIGGER update_daily_assistant_config_updated_at
BEFORE UPDATE ON public.daily_assistant_config
FOR EACH ROW
EXECUTE FUNCTION public.update_custom_widgets_updated_at();

-- Create index for performance
CREATE INDEX idx_daily_assistant_config_shop_id ON public.daily_assistant_config(shop_id);