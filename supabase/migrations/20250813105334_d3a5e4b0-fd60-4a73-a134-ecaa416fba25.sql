-- Corriger les 2 derniers warnings de sécurité

-- 1. Corriger le Function Search Path Mutable pour mask_phone_number
DROP FUNCTION IF EXISTS public.mask_phone_number(text);

CREATE OR REPLACE FUNCTION public.mask_phone_number(phone_number text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF phone_number IS NULL OR length(phone_number) < 4 THEN
    RETURN phone_number;
  END IF;
  
  -- Masquer le numéro en gardant seulement les 2 premiers et 2 derniers chiffres
  RETURN substring(phone_number from 1 for 2) || 
         repeat('*', length(phone_number) - 4) || 
         substring(phone_number from length(phone_number) - 1);
END;
$$;

-- 2. Vérifier et corriger toutes les autres fonctions sans search_path défini
-- Corriger get_current_user_shop_id si nécessaire
CREATE OR REPLACE FUNCTION public.get_current_user_shop_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Direct query to avoid recursion
  RETURN (SELECT shop_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$;

-- Corriger get_current_user_role si nécessaire  
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Direct query to avoid recursion
  RETURN (SELECT role::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$;

-- Corriger is_shop_admin si nécessaire
CREATE OR REPLACE FUNCTION public.is_shop_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = check_user_id 
    AND role = 'admin'
  );
END;
$$;

-- Corriger is_super_admin si nécessaire
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = check_user_id 
    AND role = 'super_admin'
  );
END;
$$;