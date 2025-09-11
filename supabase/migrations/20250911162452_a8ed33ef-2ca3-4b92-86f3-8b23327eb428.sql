-- Corriger manuellement toutes les réservations pour les SAV "ready"
-- D'abord, créer une requête pour calculer précisément les quantités à ajuster

WITH sav_parts_ready AS (
  SELECT 
    sp.part_id,
    SUM(sp.quantity) as total_quantity_used
  FROM sav_parts sp
  JOIN sav_cases sc ON sp.sav_case_id = sc.id
  WHERE sc.status = 'ready'
  AND sp.part_id IS NOT NULL
  GROUP BY sp.part_id
)
UPDATE public.parts
SET 
  quantity = parts.quantity - spr.total_quantity_used,
  reserved_quantity = parts.reserved_quantity - spr.total_quantity_used
FROM sav_parts_ready spr
WHERE parts.id = spr.part_id
AND parts.reserved_quantity > 0;

-- Vérifier et corriger aussi les SAV "delivered" qui pourraient avoir des réservations restantes
WITH sav_parts_delivered AS (
  SELECT 
    sp.part_id,
    SUM(sp.quantity) as total_quantity_used
  FROM sav_parts sp
  JOIN sav_cases sc ON sp.sav_case_id = sc.id
  WHERE sc.status = 'delivered'
  AND sp.part_id IS NOT NULL
  GROUP BY sp.part_id  
)
UPDATE public.parts
SET reserved_quantity = GREATEST(0, parts.reserved_quantity - spd.total_quantity_used)
FROM sav_parts_delivered spd
WHERE parts.id = spd.part_id
AND parts.reserved_quantity > 0;