-- Ajouter le nouveau statut SAV 'parts_received'
ALTER TYPE sav_status ADD VALUE 'parts_received';

-- Ajouter le statut dans les statuts par défaut pour les nouveaux shops
UPDATE shop_sav_statuses 
SET display_order = display_order + 1 
WHERE display_order >= 5 AND status_key NOT IN ('parts_received');

-- Insérer le nouveau statut pour tous les shops existants
INSERT INTO shop_sav_statuses (shop_id, status_key, status_label, status_color, display_order, is_default, is_active)
SELECT 
  id as shop_id,
  'parts_received' as status_key,
  'Pièces réceptionnées' as status_label,
  '#22c55e' as status_color,
  5 as display_order,
  true as is_default,
  true as is_active
FROM shops
ON CONFLICT (shop_id, status_key) DO NOTHING;