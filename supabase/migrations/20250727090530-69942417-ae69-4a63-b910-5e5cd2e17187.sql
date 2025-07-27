-- Fix RLS policies for customers table
DROP POLICY IF EXISTS "Shop users can manage customers" ON public.customers;

-- Allow users to insert customers for their shop
CREATE POLICY "Shop users can insert customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (shop_id IN ( 
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- Allow users to view customers for their shop
CREATE POLICY "Shop users can view customers" 
ON public.customers 
FOR SELECT 
USING (shop_id IN ( 
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- Allow users to update customers for their shop
CREATE POLICY "Shop users can update customers" 
ON public.customers 
FOR UPDATE 
USING (shop_id IN ( 
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- Allow users to delete customers for their shop
CREATE POLICY "Shop users can delete customers" 
ON public.customers 
FOR DELETE 
USING (shop_id IN ( 
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- Also fix SAV cases policies
DROP POLICY IF EXISTS "Shop users can manage SAV cases" ON public.sav_cases;

CREATE POLICY "Shop users can insert SAV cases" 
ON public.sav_cases 
FOR INSERT 
WITH CHECK (shop_id IN ( 
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can view SAV cases" 
ON public.sav_cases 
FOR SELECT 
USING (shop_id IN ( 
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can update SAV cases" 
ON public.sav_cases 
FOR UPDATE 
USING (shop_id IN ( 
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can delete SAV cases" 
ON public.sav_cases 
FOR DELETE 
USING (shop_id IN ( 
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));