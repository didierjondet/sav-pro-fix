-- Add super_admin role capability
-- Update RLS policies to allow super_admin to manage all shops and profiles

-- Super admins can view all shops
CREATE POLICY "Super admins can view all shops" 
ON public.shops 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'super_admin'
));

-- Super admins can update all shops
CREATE POLICY "Super admins can update all shops" 
ON public.shops 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'super_admin'
));

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles p2
  WHERE p2.user_id = auth.uid() 
  AND p2.role = 'super_admin'
));