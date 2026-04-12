CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ne plus créer automatiquement de shop ni de profil.
  -- L'onboarding frontend (ProfileSetup) s'en charge désormais,
  -- permettant à l'utilisateur de choisir entre créer ou rejoindre une boutique.
  RETURN NEW;
END;
$function$;