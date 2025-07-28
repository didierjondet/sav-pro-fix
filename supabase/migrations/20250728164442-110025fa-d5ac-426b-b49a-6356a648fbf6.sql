-- Supprimer la contrainte de clé étrangère sur user_id pour permettre des profils temporaires
-- Cela permettra de créer des profils d'utilisateurs avant qu'ils ne s'inscrivent réellement

-- Vérifier d'abord si la contrainte existe et la supprimer
DO $$ 
BEGIN
    -- Supprimer la contrainte de clé étrangère si elle existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_user_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_user_id_fkey;
    END IF;
END $$;

-- Créer un index sur user_id pour maintenir les performances
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Modifier la fonction pour qu'elle ne nécessite pas d'authentification pour certains cas
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

  -- Générer un nouvel UUID pour l'utilisateur (temporaire jusqu'à ce qu'il s'inscrive)
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