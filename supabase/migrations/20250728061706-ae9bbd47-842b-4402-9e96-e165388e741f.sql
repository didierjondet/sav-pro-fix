-- Créer une fonction pour permettre aux nouveaux utilisateurs de devenir super_admin
CREATE OR REPLACE FUNCTION public.ensure_super_admin_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Vérifier si l'utilisateur a déjà un profil
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid()) THEN
    -- Créer un profil super_admin pour l'utilisateur connecté
    INSERT INTO public.profiles (user_id, first_name, last_name, role)
    VALUES (
      auth.uid(),
      COALESCE(auth.jwt() ->> 'user_metadata' ->> 'first_name', 'Super'),
      COALESCE(auth.jwt() ->> 'user_metadata' ->> 'last_name', 'Admin'),
      'super_admin'
    );
  ELSE
    -- Mettre à jour le rôle existant vers super_admin si nécessaire
    UPDATE public.profiles 
    SET role = 'super_admin'
    WHERE user_id = auth.uid() AND role != 'super_admin';
  END IF;
END;
$$;

-- Politique temporaire pour permettre l'auto-création de profil super_admin
CREATE POLICY "Allow super admin profile creation" ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND role = 'super_admin');

-- Améliorer la politique pour l'insertion de magasins par les super admins
DROP POLICY IF EXISTS "Super admins can insert shops" ON public.shops;
CREATE POLICY "Super admins can insert shops" ON public.shops
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);