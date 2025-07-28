-- Corriger la fonction ensure_super_admin_profile
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
      'Super',
      'Admin',
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