-- Créer une fonction qui utilise l'API Admin pour créer de vrais utilisateurs Supabase
-- Cette fonction va créer un vrai utilisateur dans auth.users ET un profil dans profiles

CREATE OR REPLACE FUNCTION public.create_real_user_for_shop(
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
  new_user_response jsonb;
  new_user_id uuid;
  new_profile_id uuid;
BEGIN
  -- Vérifier que l'utilisateur actuel est un super admin OU un admin de la boutique concernée
  IF NOT (is_super_admin() OR (get_current_user_shop_id() = p_shop_id AND is_shop_admin())) THEN
    RAISE EXCEPTION 'Accès refusé: seuls les super admins ou les admins de la boutique peuvent créer des utilisateurs';
  END IF;

  -- Créer un vrai utilisateur via l'API Admin Supabase
  -- Note: Cette approche nécessite des privilèges service_role
  SELECT extensions.http_post(
    'https://jljkrthymaqxkebosqko.supabase.co/auth/v1/admin/users',
    jsonb_build_object(
      'email', p_email,
      'password', p_password,
      'email_confirm', true,
      'user_metadata', jsonb_build_object(
        'first_name', p_first_name,
        'last_name', p_last_name,
        'phone', p_phone,
        'role', p_role::text,
        'shop_id', p_shop_id::text
      )
    )::text,
    'application/json',
    jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
      'apikey', current_setting('app.service_role_key', true)
    )
  ) INTO new_user_response;

  -- Extraire l'ID utilisateur de la réponse
  new_user_id := (new_user_response->'content'->>'id')::uuid;
  
  IF new_user_id IS NULL THEN
    RAISE EXCEPTION 'Erreur lors de la création de l''utilisateur: %', new_user_response;
  END IF;
  
  -- Créer le profil avec l'ID utilisateur réel
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