-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_shop_id uuid;
BEGIN
  -- Create a new shop for the user
  INSERT INTO public.shops (name, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data ->> 'shop_name', 'Mon Magasin'),
    NEW.email
  )
  RETURNING id INTO new_shop_id;
  
  -- Create a profile for the user as admin
  INSERT INTO public.profiles (user_id, shop_id, first_name, last_name, role)
  VALUES (
    NEW.id,
    new_shop_id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    'admin'
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create shop and profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update shops table policies
DROP POLICY IF EXISTS "Users can view their own shop" ON public.shops;

CREATE POLICY "Shop users can view their shop" 
ON public.shops 
FOR SELECT 
USING (id IN ( 
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop admins can update their shop" 
ON public.shops 
FOR UPDATE 
USING (id IN ( 
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Update profiles table policies for admin management
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Shop users can view profiles in their shop" 
ON public.profiles 
FOR SELECT 
USING (shop_id IN ( 
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Shop admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (shop_id IN ( 
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Shop admins can update profiles in their shop" 
ON public.profiles 
FOR UPDATE 
USING (shop_id IN ( 
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Shop admins can delete profiles in their shop" 
ON public.profiles 
FOR DELETE 
USING (shop_id IN ( 
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
) AND user_id != auth.uid()); -- Admins can't delete themselves