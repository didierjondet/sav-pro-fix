-- Supprimer le trigger existant et la fonction, puis les recréer
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recréer la fonction améliorée
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_shop_id uuid;
BEGIN
  -- Ne créer automatiquement un magasin que si l'utilisateur n'a pas de profil existant
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    -- Créer un nouveau magasin pour l'utilisateur
    INSERT INTO public.shops (name, email)
    VALUES (
      COALESCE(NEW.raw_user_meta_data ->> 'shop_name', 'Mon Magasin'),
      NEW.email
    )
    RETURNING id INTO new_shop_id;
    
    -- Créer un profil pour l'utilisateur en tant qu'admin du magasin
    INSERT INTO public.profiles (user_id, shop_id, first_name, last_name, role)
    VALUES (
      NEW.id,
      new_shop_id,
      COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
      'admin'  -- Premier utilisateur = admin automatiquement
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Créer une fonction pour inviter un utilisateur par email
CREATE OR REPLACE FUNCTION public.invite_user_to_shop(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_role user_role,
  p_shop_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invite_token text;
  result jsonb;
BEGIN
  -- Vérifier que l'utilisateur actuel est admin de cette boutique
  IF NOT (get_current_user_shop_id() = p_shop_id AND is_shop_admin()) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Accès refusé: seuls les admins de la boutique peuvent inviter des utilisateurs'
    );
  END IF;

  -- Générer un token d'invitation unique
  invite_token := encode(gen_random_bytes(32), 'base64');
  
  -- Créer un profil temporaire avec le token d'invitation
  INSERT INTO public.profiles (
    user_id,
    shop_id,
    first_name,
    last_name,
    phone,
    role
  ) VALUES (
    gen_random_uuid(), -- ID temporaire jusqu'à ce que l'utilisateur s'inscrive
    p_shop_id,
    p_first_name,
    p_last_name,
    p_phone,
    p_role
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'invite_token', invite_token,
    'invite_url', format('https://your-domain.com/invite?token=%s&email=%s', invite_token, p_email)
  );
END;
$$;