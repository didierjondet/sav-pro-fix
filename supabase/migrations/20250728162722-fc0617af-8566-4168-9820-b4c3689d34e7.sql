-- Permettre aux super admins de créer des utilisateurs via l'Admin API
-- et corriger les politiques pour la création d'utilisateurs

-- Fonction pour créer un utilisateur et son profil (pour les super admins)
CREATE OR REPLACE FUNCTION public.create_user_with_profile(
  p_email text,
  p_password text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_role user_role,
  p_shop_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_user_id uuid;
  new_profile_id uuid;
BEGIN
  -- Vérifier que l'utilisateur actuel est un super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Accès refusé: seuls les super admins peuvent créer des utilisateurs';
  END IF;

  -- Générer un nouvel UUID pour l'utilisateur
  new_user_id := gen_random_uuid();
  
  -- Créer le profil avec l'ID utilisateur
  INSERT INTO public.profiles (
    user_id,
    shop_id,
    first_name,
    last_name,
    phone,
    role
  ) VALUES (
    new_user_id,
    p_shop_id,
    p_first_name,
    p_last_name,
    p_phone,
    p_role
  ) RETURNING id INTO new_profile_id;
  
  -- Retourner l'ID du profil créé
  RETURN new_profile_id;
END;
$$;

-- Mettre à jour la politique pour permettre aux super admins de créer n'importe quel profil
DROP POLICY IF EXISTS "Allow super admin profile creation" ON public.profiles;

CREATE POLICY "Allow super admin to create any profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (is_super_admin());

-- Politique pour permettre aux admins de boutique de créer des profils pour leur boutique
CREATE POLICY "Shop admins can create profiles for their shop"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    (shop_id = get_current_user_shop_id() AND is_shop_admin()) 
    OR shop_id IS NULL
  );