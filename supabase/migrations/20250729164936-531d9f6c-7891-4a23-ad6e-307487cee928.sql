-- Fix RLS policies for super admin access
-- Create security definer function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update shops policies to allow super admin access
DROP POLICY IF EXISTS "Super admins can manage all shops" ON public.shops;
CREATE POLICY "Super admins can manage all shops" ON public.shops
FOR ALL USING (public.is_super_admin());

-- Update profiles policies to allow super admin access
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
CREATE POLICY "Super admins can manage all profiles" ON public.profiles
FOR ALL USING (public.is_super_admin());

-- Update parts policies
DROP POLICY IF EXISTS "Super admins can manage all parts" ON public.parts;
CREATE POLICY "Super admins can manage all parts" ON public.parts
FOR ALL USING (public.is_super_admin());

-- Update customers policies
DROP POLICY IF EXISTS "Super admins can manage all customers" ON public.customers;
CREATE POLICY "Super admins can manage all customers" ON public.customers
FOR ALL USING (public.is_super_admin());

-- Update sav_cases policies
DROP POLICY IF EXISTS "Super admins can manage all sav_cases" ON public.sav_cases;
CREATE POLICY "Super admins can manage all sav_cases" ON public.sav_cases
FOR ALL USING (public.is_super_admin());

-- Update quotes policies
DROP POLICY IF EXISTS "Super admins can manage all quotes" ON public.quotes;
CREATE POLICY "Super admins can manage all quotes" ON public.quotes
FOR ALL USING (public.is_super_admin());

-- Update order_items policies
DROP POLICY IF EXISTS "Super admins can manage all order_items" ON public.order_items;
CREATE POLICY "Super admins can manage all order_items" ON public.order_items
FOR ALL USING (public.is_super_admin());

-- Update notifications policies
DROP POLICY IF EXISTS "Super admins can manage all notifications" ON public.notifications;
CREATE POLICY "Super admins can manage all notifications" ON public.notifications
FOR ALL USING (public.is_super_admin());

-- Update sav_messages policies
DROP POLICY IF EXISTS "Super admins can manage all sav_messages" ON public.sav_messages;
CREATE POLICY "Super admins can manage all sav_messages" ON public.sav_messages
FOR ALL USING (public.is_super_admin());