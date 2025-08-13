-- CORRECTION DÉFINITIVE des vulnérabilités de sécurité
-- Le problème était que certaines politiques avaient le rôle 'public' au lieu de 'authenticated'

-- 1. Corriger les politiques sur sav_cases
-- Supprimer les politiques qui donnent accès public aux opérations sensibles
DROP POLICY IF EXISTS "Shop users can delete SAV cases" ON public.sav_cases;
DROP POLICY IF EXISTS "Shop users can insert SAV cases" ON public.sav_cases;
DROP POLICY IF EXISTS "Shop users can update SAV cases" ON public.sav_cases;
DROP POLICY IF EXISTS "Shop users can view SAV cases" ON public.sav_cases;

-- Recréer les politiques avec le bon rôle 'authenticated' seulement
CREATE POLICY "Shop users can delete SAV cases" ON public.sav_cases
FOR DELETE TO authenticated
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can insert SAV cases" ON public.sav_cases
FOR INSERT TO authenticated
WITH CHECK (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can update SAV cases" ON public.sav_cases
FOR UPDATE TO authenticated
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can view SAV cases" ON public.sav_cases
FOR SELECT TO authenticated
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- 2. Corriger les politiques sur sav_messages
-- Supprimer les politiques qui donnent accès public
DROP POLICY IF EXISTS "Public can insert client messages" ON public.sav_messages;
DROP POLICY IF EXISTS "Shop users can insert SAV messages" ON public.sav_messages;
DROP POLICY IF EXISTS "Shop users can update their SAV messages" ON public.sav_messages;
DROP POLICY IF EXISTS "Shop users can view their SAV messages" ON public.sav_messages;

-- Recréer les politiques correctement
CREATE POLICY "Public can insert client messages" ON public.sav_messages
FOR INSERT TO anon, authenticated
WITH CHECK (sender_type = 'client');

CREATE POLICY "Shop users can insert SAV messages" ON public.sav_messages
FOR INSERT TO authenticated
WITH CHECK (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can update their SAV messages" ON public.sav_messages
FOR UPDATE TO authenticated
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can view their SAV messages" ON public.sav_messages
FOR SELECT TO authenticated
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- 3. Corriger les politiques sur customers
-- Supprimer les politiques avec le mauvais rôle
DROP POLICY IF EXISTS "Shop users can view customers" ON public.customers;

-- Recréer avec le bon rôle
CREATE POLICY "Shop users can view customers" ON public.customers
FOR SELECT TO authenticated
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));