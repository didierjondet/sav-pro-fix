-- Ajouter la colonne is_final_status à shop_sav_statuses
ALTER TABLE shop_sav_statuses 
ADD COLUMN is_final_status BOOLEAN NOT NULL DEFAULT false;

-- Créer un index pour les performances
CREATE INDEX idx_shop_sav_statuses_final 
ON shop_sav_statuses(shop_id, is_final_status);

-- Mettre à jour les statuts existants pour marquer les finaux
UPDATE shop_sav_statuses 
SET is_final_status = true 
WHERE status_key IN ('ready', 'pret', 'delivered', 'livre', 'cancelled', 'annule', 'termine', 'cloture')
   OR status_label ILIKE '%prêt%' 
   OR status_label ILIKE '%terminé%'
   OR status_label ILIKE '%livré%'
   OR status_label ILIKE '%annulé%'
   OR status_label ILIKE '%clôturé%';

-- Mettre à jour la fonction de création des statuts par défaut pour les nouvelles boutiques
CREATE OR REPLACE FUNCTION add_default_sav_statuses_to_new_shop()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO shop_sav_statuses (shop_id, status_key, status_label, status_color, display_order, is_default, pause_timer, show_in_sidebar, is_final_status)
  VALUES 
    (NEW.id, 'pending', 'En attente', '#f59e0b', 1, true, false, true, false),
    (NEW.id, 'in_progress', 'En cours', '#3b82f6', 2, true, false, true, false),
    (NEW.id, 'parts_ordered', 'Pièces commandées', '#8b5cf6', 3, true, true, true, false),
    (NEW.id, 'testing', 'Tests en cours', '#06b6d4', 4, true, false, true, false),
    (NEW.id, 'ready', 'Prêt', '#10b981', 5, true, false, true, true),
    (NEW.id, 'cancelled', 'Annulé', '#ef4444', 6, true, false, false, true);
  RETURN NEW;
END;
$$;