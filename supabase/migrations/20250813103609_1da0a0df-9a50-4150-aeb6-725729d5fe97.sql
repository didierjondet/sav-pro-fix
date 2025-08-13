-- SUPPRESSION COMPLÈTE de l'accès public aux données sensibles

-- 1. Supprimer complètement les politiques d'accès public aux tables sensibles
DROP POLICY IF EXISTS "Public can view basic tracking info" ON public.sav_cases;
DROP POLICY IF EXISTS "Public can view messages for tracked cases" ON public.sav_messages;

-- 2. Les seules données publiques autorisées seront via des fonctions spécifiques
-- Créer une fonction sécurisée pour le tracking public qui ne révèle que le minimum
CREATE OR REPLACE FUNCTION public.get_tracking_info(p_tracking_slug text)
RETURNS TABLE (
  case_number text,
  status sav_status,
  device_brand text,
  device_model text,
  created_at timestamp with time zone,
  total_cost numeric,
  customer_first_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.case_number,
    sc.status,
    sc.device_brand,
    sc.device_model,
    sc.created_at,
    sc.total_cost,
    c.first_name
  FROM sav_cases sc
  LEFT JOIN customers c ON sc.customer_id = c.id
  WHERE sc.tracking_slug = p_tracking_slug
  AND sc.tracking_slug IS NOT NULL
  AND sc.tracking_slug != '';
END;
$$;

-- 3. Créer une fonction pour les messages de tracking (minimal)
CREATE OR REPLACE FUNCTION public.get_tracking_messages(p_tracking_slug text)
RETURNS TABLE (
  sender_type text,
  sender_name text,
  message text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.sender_type,
    sm.sender_name,
    sm.message,
    sm.created_at
  FROM sav_messages sm
  JOIN sav_cases sc ON sm.sav_case_id = sc.id
  WHERE sc.tracking_slug = p_tracking_slug
  AND sc.tracking_slug IS NOT NULL
  AND sc.tracking_slug != '';
END;
$$;

-- 4. Accorder l'accès public aux fonctions seulement
GRANT EXECUTE ON FUNCTION public.get_tracking_info(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tracking_messages(text) TO anon, authenticated;