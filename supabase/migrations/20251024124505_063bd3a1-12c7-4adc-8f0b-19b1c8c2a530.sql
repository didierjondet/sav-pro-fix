-- Optimiser les fonctions RLS avec cache STABLE pour résoudre la lenteur généralisée
-- Ces fonctions sont appelées sur CHAQUE ligne, le cache STABLE va drastiquement améliorer les performances

-- Optimiser get_current_user_shop_id() avec cache
CREATE OR REPLACE FUNCTION public.get_current_user_shop_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE  -- ✅ CACHE le résultat pendant la transaction
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$function$;

-- Optimiser is_super_admin() avec cache
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE  -- ✅ CACHE le résultat pendant la transaction
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = check_user_id 
    AND role = 'super_admin'
  );
END;
$function$;

-- Optimiser is_shop_admin() avec cache
CREATE OR REPLACE FUNCTION public.is_shop_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE  -- ✅ CACHE le résultat pendant la transaction
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = check_user_id 
    AND role = 'admin'
  );
END;
$function$;

-- Optimiser get_current_user_role() avec cache si elle existe
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE  -- ✅ CACHE le résultat pendant la transaction
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (SELECT role::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$function$;