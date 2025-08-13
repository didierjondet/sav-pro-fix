-- Identifier et corriger toutes les vues avec SECURITY DEFINER

-- 1. Supprimer toutes les vues qui pourraient avoir SECURITY DEFINER
DROP VIEW IF EXISTS public.customer_tracking_info CASCADE;

-- 2. Recréer customer_tracking_info comme une vue simple
CREATE VIEW public.customer_tracking_info AS
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

-- Accorder les permissions
GRANT SELECT ON public.customer_tracking_info TO anon;
GRANT SELECT ON public.customer_tracking_info TO authenticated;