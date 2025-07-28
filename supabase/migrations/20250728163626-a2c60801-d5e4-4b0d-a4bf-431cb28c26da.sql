-- Corriger les politiques pour permettre aux super admins de créer des utilisateurs dans n'importe quelle boutique
-- et créer une fonction spéciale pour eux

-- Fonction pour créer un utilisateur avec profil (super admin uniquement)
CREATE OR REPLACE FUNCTION public.create_user_for_shop(
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
  temp_user_id uuid;
  new_profile_id uuid;
BEGIN
  -- Vérifier que l'utilisateur actuel est un super admin OU un admin de la boutique concernée
  IF NOT (is_super_admin() OR (get_current_user_shop_id() = p_shop_id AND is_shop_admin())) THEN
    RAISE EXCEPTION 'Accès refusé: seuls les super admins ou les admins de la boutique peuvent créer des utilisateurs';
  END IF;

  -- Générer un nouvel UUID temporaire pour l'utilisateur
  temp_user_id := gen_random_uuid();
  
  -- Créer le profil avec l'ID utilisateur temporaire
  INSERT INTO public.profiles (
    user_id,
    shop_id,
    first_name,
    last_name,
    phone,
    role
  ) VALUES (
    temp_user_id,
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

-- Mettre à jour les politiques pour les profils
DROP POLICY IF EXISTS "Shop admins can create profiles for their shop" ON public.profiles;

CREATE POLICY "Admins can create profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    is_super_admin() 
    OR (shop_id = get_current_user_shop_id() AND is_shop_admin()) 
    OR shop_id IS NULL
  );