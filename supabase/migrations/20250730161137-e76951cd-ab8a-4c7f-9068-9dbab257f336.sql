-- Add website columns to shops table
ALTER TABLE public.shops 
ADD COLUMN website_enabled boolean DEFAULT false,
ADD COLUMN website_title text,
ADD COLUMN website_description text;

-- Create shop_services table
CREATE TABLE public.shop_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 30,
  category text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on shop_services
ALTER TABLE public.shop_services ENABLE ROW LEVEL SECURITY;

-- Create policies for shop_services
CREATE POLICY "Shop users can manage their services" 
ON public.shop_services 
FOR ALL 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Super admins can manage all services" 
ON public.shop_services 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_shop_services_updated_at
  BEFORE UPDATE ON public.shop_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();