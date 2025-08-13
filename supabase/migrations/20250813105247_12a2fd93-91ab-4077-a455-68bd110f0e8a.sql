-- Corriger les warnings de sécurité de la base de données

-- 1. Réduire l'expiration OTP de 3600s (1h) à 600s (10min) pour une sécurité renforcée
-- Cela doit être fait dans la configuration Supabase mais on peut ajouter un commentaire pour rappel

-- 2. Renforcer la sécurité des données clients dans la table customers
-- Ajouter des politiques plus restrictives pour les données PII

-- Supprimer les anciennes politiques trop permissives si elles existent
DROP POLICY IF EXISTS "Shop users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Shop users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Shop users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Shop users can delete customers" ON public.customers;

-- Recréer les politiques avec des restrictions plus strictes
CREATE POLICY "Shop users can view their own customers"
ON public.customers FOR SELECT
USING (
  shop_id = get_current_user_shop_id()
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Shop users can insert customers for their shop"
ON public.customers FOR INSERT
WITH CHECK (
  shop_id = get_current_user_shop_id()
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Shop users can update their own customers"
ON public.customers FOR UPDATE
USING (
  shop_id = get_current_user_shop_id()
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Shop users can delete their own customers"
ON public.customers FOR DELETE
USING (
  shop_id = get_current_user_shop_id()
  AND auth.uid() IS NOT NULL
);

-- 3. Renforcer la sécurité des quotes avec des données client sensibles
DROP POLICY IF EXISTS "Shop users can view their quotes" ON public.quotes;
DROP POLICY IF EXISTS "Shop users can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Shop users can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Shop users can delete quotes" ON public.quotes;

CREATE POLICY "Shop users can view their shop quotes only"
ON public.quotes FOR SELECT
USING (
  shop_id = get_current_user_shop_id()
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Shop users can insert quotes for their shop only"
ON public.quotes FOR INSERT
WITH CHECK (
  shop_id = get_current_user_shop_id()
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Shop users can update their shop quotes only"
ON public.quotes FOR UPDATE
USING (
  shop_id = get_current_user_shop_id()
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Shop users can delete their shop quotes only"
ON public.quotes FOR DELETE
USING (
  shop_id = get_current_user_shop_id()
  AND auth.uid() IS NOT NULL
);

-- 4. Renforcer la sécurité des profils d'employés
DROP POLICY IF EXISTS "Shop users can view profiles in their shop" ON public.profiles;

CREATE POLICY "Shop users can view profiles in their shop only"
ON public.profiles FOR SELECT
USING (
  shop_id = get_current_user_shop_id()
  AND auth.uid() IS NOT NULL
);

-- 5. Renforcer la sécurité de l'historique SMS
DROP POLICY IF EXISTS "Shop users can view their SMS history" ON public.sms_history;
DROP POLICY IF EXISTS "Shop users can insert their SMS history" ON public.sms_history;

CREATE POLICY "Shop users can view their SMS history only"
ON public.sms_history FOR SELECT
USING (
  shop_id = get_current_user_shop_id()
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Shop users can insert SMS history for their shop only"
ON public.sms_history FOR INSERT
WITH CHECK (
  shop_id = get_current_user_shop_id()
  AND auth.uid() IS NOT NULL
);

-- 6. Ajouter une fonction pour masquer les données sensibles dans les logs
CREATE OR REPLACE FUNCTION public.mask_phone_number(phone_number text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Ajouter un commentaire de sécurité sur les données de contact des shops
COMMENT ON COLUMN public.shops.phone IS 'Contact phone - accessible to shop users only';
COMMENT ON COLUMN public.shops.email IS 'Contact email - accessible to shop users only';
COMMENT ON COLUMN public.shops.address IS 'Business address - accessible to shop users only';