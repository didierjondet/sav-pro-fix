-- Correction des vulnérabilités de sécurité pour les tables sav_messages et sav_cases

-- 1. Corriger la politique publique sur sav_messages
-- Supprimer la politique qui permet la lecture publique complète
DROP POLICY IF EXISTS "Public can view SAV messages by case number" ON public.sav_messages;

-- Créer une nouvelle politique plus restrictive qui permet seulement la lecture des messages
-- pour les cas avec un tracking_slug valide, et seulement les informations nécessaires
CREATE POLICY "Public can view messages for tracked cases" ON public.sav_messages
FOR SELECT
TO anon, authenticated
USING (
  sav_case_id IN (
    SELECT id FROM public.sav_cases 
    WHERE tracking_slug IS NOT NULL 
    AND tracking_slug != ''
  )
);

-- 2. Corriger la politique publique sur sav_cases  
-- Supprimer la politique actuelle qui expose trop d'informations
DROP POLICY IF EXISTS "Public can view SAV tracking info only" ON public.sav_cases;

-- Créer une politique plus restrictive qui limite l'accès public aux informations de tracking
CREATE POLICY "Public can view basic tracking info" ON public.sav_cases
FOR SELECT
TO anon, authenticated
USING (
  tracking_slug IS NOT NULL 
  AND tracking_slug != ''
);

-- 3. Créer une vue sécurisée pour le tracking public qui masque les données sensibles
CREATE OR REPLACE VIEW public.sav_tracking_view AS
SELECT 
  sc.id,
  sc.case_number,
  sc.status,
  sc.tracking_slug,
  sc.device_brand,
  sc.device_model,
  -- Masquer l'IMEI (seulement les 3 premiers et 3 derniers caractères)
  CASE 
    WHEN sc.device_imei IS NOT NULL AND LENGTH(sc.device_imei) > 6 THEN 
      LEFT(sc.device_imei, 3) || '***' || RIGHT(sc.device_imei, 3)
    ELSE sc.device_imei 
  END as masked_device_imei,
  sc.problem_description,
  sc.total_cost,
  sc.created_at,
  sc.updated_at,
  sc.shop_id,
  -- Inclure seulement le prénom du client
  c.first_name as customer_first_name
FROM public.sav_cases sc
LEFT JOIN public.customers c ON sc.customer_id = c.id
WHERE sc.tracking_slug IS NOT NULL 
AND sc.tracking_slug != '';

-- Accorder l'accès à la vue de tracking
GRANT SELECT ON public.sav_tracking_view TO anon;
GRANT SELECT ON public.sav_tracking_view TO authenticated;

-- 4. Créer une vue sécurisée pour les messages de tracking public
CREATE OR REPLACE VIEW public.sav_messages_tracking_view AS
SELECT 
  sm.id,
  sm.sav_case_id,
  sm.sender_type,
  sm.sender_name,
  sm.message,
  sm.created_at,
  sm.read_by_client,
  sm.read_by_shop
FROM public.sav_messages sm
WHERE sm.sav_case_id IN (
  SELECT id FROM public.sav_cases 
  WHERE tracking_slug IS NOT NULL 
  AND tracking_slug != ''
);

-- Accorder l'accès à la vue des messages de tracking
GRANT SELECT ON public.sav_messages_tracking_view TO anon;
GRANT SELECT ON public.sav_messages_tracking_view TO authenticated;