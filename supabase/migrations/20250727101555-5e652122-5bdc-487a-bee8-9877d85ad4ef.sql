-- Fix infinite recursion by creating security definer functions
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

-- Create statistics view for super admins
CREATE OR REPLACE VIEW public.shop_statistics AS
SELECT 
  s.id,
  s.name,
  s.email,
  s.phone,
  s.address,
  s.sms_credits,
  s.created_at,
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT sc.id) as total_sav_cases,
  COUNT(DISTINCT CASE WHEN sc.status = 'pending' THEN sc.id END) as pending_cases,
  COUNT(DISTINCT CASE WHEN sc.status = 'in_progress' THEN sc.id END) as in_progress_cases,
  COUNT(DISTINCT CASE WHEN sc.status = 'ready' THEN sc.id END) as ready_cases,
  COUNT(DISTINCT CASE WHEN sc.status = 'delivered' THEN sc.id END) as delivered_cases,
  COALESCE(SUM(sc.total_cost), 0) as total_revenue,
  COALESCE(AVG(sc.total_cost), 0) as average_case_value
FROM public.shops s
LEFT JOIN public.profiles p ON s.id = p.shop_id
LEFT JOIN public.sav_cases sc ON s.id = sc.shop_id
GROUP BY s.id, s.name, s.email, s.phone, s.address, s.sms_credits, s.created_at;

-- Grant access to statistics view
GRANT SELECT ON public.shop_statistics TO authenticated;

-- Add RLS policy for statistics view
CREATE POLICY "Super admins can view shop statistics" 
ON public.shop_statistics 
FOR SELECT 
USING (public.is_super_admin());