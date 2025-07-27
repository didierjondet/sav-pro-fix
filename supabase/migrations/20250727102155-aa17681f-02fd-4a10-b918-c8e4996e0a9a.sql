-- Fix infinite recursion by creating security definer functions (retry without view policy)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  -- Direct query to avoid recursion
  RETURN (SELECT role::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_current_user_shop_id()
RETURNS UUID AS $$
BEGIN
  -- Direct query to avoid recursion
  RETURN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_shop_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = check_user_id 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = check_user_id 
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Shop users can view profiles in their shop" ON public.profiles;
DROP POLICY IF EXISTS "Shop admins can update profiles in their shop" ON public.profiles;
DROP POLICY IF EXISTS "Shop admins can delete profiles in their shop" ON public.profiles;
DROP POLICY IF EXISTS "Shop admins can insert profiles" ON public.profiles;

-- Recreate policies using security definer functions
CREATE POLICY "Shop users can view profiles in their shop" 
ON public.profiles 
FOR SELECT 
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Shop admins can update profiles in their shop" 
ON public.profiles 
FOR UPDATE 
USING (
  shop_id = public.get_current_user_shop_id() 
  AND public.is_shop_admin()
);

CREATE POLICY "Shop admins can delete profiles in their shop" 
ON public.profiles 
FOR DELETE 
USING (
  shop_id = public.get_current_user_shop_id() 
  AND public.is_shop_admin()
  AND user_id <> auth.uid()
);

CREATE POLICY "Shop admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  shop_id = public.get_current_user_shop_id() 
  AND public.is_shop_admin()
);

-- Create shop management policies for super admins
CREATE POLICY "Super admins can insert shops" 
ON public.shops 
FOR INSERT 
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete shops" 
ON public.shops 
FOR DELETE 
USING (public.is_super_admin());