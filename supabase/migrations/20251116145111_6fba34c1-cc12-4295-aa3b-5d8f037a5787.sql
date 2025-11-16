-- =====================================================
-- REFONTE DU SYSTÈME DE NOTIFICATIONS
-- =====================================================
-- 
-- Objectifs:
-- 1. Nettoyage automatique des notifications de retard quand un SAV change de statut
-- 2. Nettoyage des anciennes notifications existantes
--
-- =====================================================

-- 1. Créer une fonction pour nettoyer les notifications de retard d'un SAV
CREATE OR REPLACE FUNCTION cleanup_sav_delay_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Quand le statut change vers 'ready', 'cancelled', ou 'delivered'
  IF NEW.status IN ('ready', 'cancelled', 'delivered') AND OLD.status != NEW.status THEN
    -- Supprimer toutes les notifications de retard NON LUES pour ce SAV
    DELETE FROM notifications 
    WHERE sav_case_id = NEW.id 
    AND type = 'sav_delay_alert'
    AND read = false;
    
    RAISE NOTICE 'Notifications de retard supprimées pour SAV %', NEW.case_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Créer le trigger sur changement de statut
DROP TRIGGER IF EXISTS trigger_cleanup_sav_notifications ON sav_cases;

CREATE TRIGGER trigger_cleanup_sav_notifications
AFTER UPDATE OF status ON sav_cases
FOR EACH ROW
EXECUTE FUNCTION cleanup_sav_delay_notifications();

-- =====================================================
-- NETTOYAGE DES DONNÉES EXISTANTES
-- =====================================================

-- 3. Supprimer les anciennes notifications de retard non lues (plus de 7 jours)
DELETE FROM notifications 
WHERE type = 'sav_delay_alert' 
AND read = false 
AND created_at < NOW() - INTERVAL '7 days';

-- 4. Marquer comme lues les notifications de retard pour les SAV déjà terminés
UPDATE notifications 
SET read = true 
WHERE type = 'sav_delay_alert' 
AND read = false 
AND sav_case_id IN (
  SELECT id FROM sav_cases 
  WHERE status IN ('ready', 'cancelled', 'delivered')
);

-- 5. Log du nettoyage effectué
DO $$
DECLARE
  deleted_count INTEGER;
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  SELECT COUNT(*) INTO updated_count
  FROM notifications 
  WHERE type = 'sav_delay_alert' 
  AND read = true 
  AND sav_case_id IN (
    SELECT id FROM sav_cases 
    WHERE status IN ('ready', 'cancelled', 'delivered')
  );
  
  RAISE NOTICE '✅ Nettoyage terminé: % notifications supprimées, % notifications marquées comme lues', 
    deleted_count, updated_count;
END $$;