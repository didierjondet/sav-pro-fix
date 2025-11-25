-- Create widget_configurations table to store per-widget settings
CREATE TABLE IF NOT EXISTS public.widget_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  widget_id text NOT NULL,
  temporality text DEFAULT 'monthly' CHECK (temporality IN ('monthly', 'quarterly', 'yearly')),
  sav_statuses_filter text[] DEFAULT NULL,
  sav_types_filter text[] DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(shop_id, widget_id)
);

-- Enable RLS
ALTER TABLE public.widget_configurations ENABLE ROW LEVEL SECURITY;

-- Policy: Shop users can view their widget configs
CREATE POLICY "Shop users can view their widget configs"
ON public.widget_configurations FOR SELECT
TO authenticated
USING (shop_id = get_current_user_shop_id());

-- Policy: Shop admins can manage widget configs
CREATE POLICY "Shop admins can manage widget configs"
ON public.widget_configurations FOR ALL
TO authenticated
USING (shop_id = get_current_user_shop_id() AND is_shop_admin())
WITH CHECK (shop_id = get_current_user_shop_id() AND is_shop_admin());

-- Policy: Super admins can manage all widget configs
CREATE POLICY "Super admins can manage all widget configs"
ON public.widget_configurations FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Create updated_at trigger
CREATE TRIGGER update_widget_configurations_updated_at
BEFORE UPDATE ON public.widget_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_custom_widgets_updated_at();

-- Create index for performance
CREATE INDEX idx_widget_configurations_shop_id ON public.widget_configurations(shop_id);
CREATE INDEX idx_widget_configurations_widget_id ON public.widget_configurations(widget_id);