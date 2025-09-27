-- Supprimer d'abord la fonction qui dépend de l'enum
DROP FUNCTION IF EXISTS public.get_tracking_info(text) CASCADE;

-- Changer sav_cases.sav_type de enum vers text pour supporter les types dynamiques
ALTER TABLE public.sav_cases ALTER COLUMN sav_type TYPE text;

-- Supprimer l'enum sav_type maintenant qu'il n'y a plus de dépendances
DROP TYPE IF EXISTS public.sav_type CASCADE;

-- Recréer la fonction get_tracking_info pour retourner text au lieu de l'enum
CREATE OR REPLACE FUNCTION public.get_tracking_info(p_tracking_slug text)
 RETURNS TABLE(
   case_number text, 
   status text, 
   device_brand text, 
   device_model text, 
   created_at timestamp with time zone, 
   total_cost numeric, 
   customer_first_name text, 
   sav_case_id uuid, 
   sav_type text, 
   shop_name text, 
   shop_phone text, 
   shop_email text, 
   shop_address text, 
   shop_logo_url text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sc.case_number,
    sc.status,
    sc.device_brand,
    sc.device_model,
    sc.created_at,
    sc.total_cost,
    c.first_name,
    sc.id as sav_case_id,
    sc.sav_type,
    s.name as shop_name,
    s.phone as shop_phone,
    s.email as shop_email,
    s.address as shop_address,
    s.logo_url as shop_logo_url
  FROM sav_cases sc
  LEFT JOIN customers c ON sc.customer_id = c.id
  LEFT JOIN shops s ON sc.shop_id = s.id
  WHERE sc.tracking_slug = p_tracking_slug
  AND sc.tracking_slug IS NOT NULL
  AND sc.tracking_slug != '';
END;
$function$