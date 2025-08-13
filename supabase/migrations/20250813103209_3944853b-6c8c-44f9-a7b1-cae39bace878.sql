-- Corriger les problèmes de Security Definer sur les vues

-- 1. Supprimer et recréer customer_tracking_view sans SECURITY DEFINER
DROP VIEW IF EXISTS public.customer_tracking_view;
CREATE VIEW public.customer_tracking_view AS
SELECT 
  c.id,
  c.first_name,
  CASE 
    WHEN c.email IS NOT NULL THEN 
      SUBSTRING(c.email FROM 1 FOR 2) || '***@' || 
      SUBSTRING(c.email FROM POSITION('@' IN c.email) + 1)
    ELSE NULL 
  END as masked_email,
  CASE 
    WHEN c.phone IS NOT NULL THEN 
      SUBSTRING(c.phone FROM 1 FOR 2) || '***' || 
      RIGHT(c.phone, 2)
    ELSE NULL 
  END as masked_phone
FROM public.customers c
WHERE EXISTS (
  SELECT 1 FROM public.sav_cases sc 
  WHERE sc.customer_id = c.id 
  AND sc.tracking_slug IS NOT NULL 
  AND sc.tracking_slug != ''
);

-- 2. Supprimer et recréer sav_tracking_view sans SECURITY DEFINER
DROP VIEW IF EXISTS public.sav_tracking_view;
CREATE VIEW public.sav_tracking_view AS
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

-- 3. Supprimer et recréer sav_messages_tracking_view sans SECURITY DEFINER
DROP VIEW IF EXISTS public.sav_messages_tracking_view;
CREATE VIEW public.sav_messages_tracking_view AS
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

-- Accorder les permissions nécessaires
GRANT SELECT ON public.customer_tracking_view TO anon;
GRANT SELECT ON public.customer_tracking_view TO authenticated;
GRANT SELECT ON public.sav_tracking_view TO anon;
GRANT SELECT ON public.sav_tracking_view TO authenticated;
GRANT SELECT ON public.sav_messages_tracking_view TO anon;
GRANT SELECT ON public.sav_messages_tracking_view TO authenticated;