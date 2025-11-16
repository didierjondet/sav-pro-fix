-- Correction du search_path pour la fonction de nettoyage des notifications
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';