-- Ajouter le nouveau statut "parts_ordered" et supprimer "delivered"
-- D'abord, ajouter le nouveau statut à l'enum
ALTER TYPE sav_status ADD VALUE 'parts_ordered';

-- Mettre à jour tous les SAV avec le statut "delivered" vers "ready"
UPDATE sav_cases SET status = 'ready' WHERE status = 'delivered';

-- Mettre à jour les tables liées qui utilisent le statut delivered
UPDATE sav_status_history SET status = 'ready' WHERE status = 'delivered';