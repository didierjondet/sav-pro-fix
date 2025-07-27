-- Fix infinite recursion in profiles policies by using security definer functions
-- Drop problematic policies
DROP POLICY IF EXISTS "Shop admins can delete profiles in their shop" ON public.profiles;
DROP POLICY IF EXISTS "Shop admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Shop admins can update profiles in their shop" ON public.profiles;
DROP POLICY IF EXISTS "Shop users can view profiles in their shop" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policies using security definer functions
CREATE POLICY "Shop users can view profiles in their shop" 
ON public.profiles 
FOR SELECT 
USING (shop_id = get_current_user_shop_id());

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Shop admins can update profiles in their shop" 
ON public.profiles 
FOR UPDATE 
USING (shop_id = get_current_user_shop_id() AND is_shop_admin());

CREATE POLICY "Shop admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (shop_id = get_current_user_shop_id() AND is_shop_admin());

CREATE POLICY "Shop admins can delete profiles in their shop" 
ON public.profiles 
FOR DELETE 
USING (shop_id = get_current_user_shop_id() AND is_shop_admin() AND user_id != auth.uid());

CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_super_admin());

-- Add slug column to shops for custom URLs
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Create index for slug
CREATE INDEX IF NOT EXISTS idx_shops_slug ON public.shops(slug);

-- Function to generate slug from shop name
CREATE OR REPLACE FUNCTION generate_shop_slug(shop_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  -- Convert name to lowercase, replace spaces and special chars with hyphens
  base_slug := lower(regexp_replace(shop_name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- Ensure slug is not empty
  IF base_slug = '' THEN
    base_slug := 'shop';
  END IF;
  
  final_slug := base_slug;
  
  -- Check if slug exists and increment if needed
  WHILE EXISTS (SELECT 1 FROM public.shops WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Trigger to auto-generate slug when shop is created
CREATE OR REPLACE FUNCTION set_shop_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_shop_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_shop_slug ON public.shops;
CREATE TRIGGER trigger_set_shop_slug
  BEFORE INSERT OR UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION set_shop_slug();