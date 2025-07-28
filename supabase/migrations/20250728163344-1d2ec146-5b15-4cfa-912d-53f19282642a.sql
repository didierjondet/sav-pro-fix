-- Corriger la fonction pour qu'elle ne fonctionne que pour les super admins avec l'API Admin
-- et créer une fonction séparée pour les admins de boutique

-- Fonction pour créer un profil utilisateur temporaire (pour les admins de boutique)
CREATE OR REPLACE FUNCTION public.create_profile_only(
  p_email text,
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
  -- Vérifier que l'utilisateur actuel est un admin de la boutique
  IF NOT (get_current_user_shop_id() = p_shop_id AND is_shop_admin()) THEN
    RAISE EXCEPTION 'Accès refusé: seuls les admins de la boutique peuvent créer des utilisateurs pour leur boutique';
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