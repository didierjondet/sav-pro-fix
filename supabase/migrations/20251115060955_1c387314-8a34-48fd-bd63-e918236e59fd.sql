-- Ajouter la colonne security_codes pour stocker les codes sensibles
ALTER TABLE sav_cases 
ADD COLUMN IF NOT EXISTS security_codes JSONB DEFAULT NULL;

COMMENT ON COLUMN sav_cases.security_codes IS 
'Codes sensibles (unlock_code, icloud_id, icloud_password, sim_pin) - automatiquement supprimés au statut ready/cancelled';

-- Fonction pour supprimer automatiquement les codes sensibles
CREATE OR REPLACE FUNCTION clear_security_codes_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le statut passe à 'ready' ou 'cancelled', supprimer les codes
  IF NEW.status IN ('ready', 'cancelled') AND (OLD.status IS NULL OR OLD.status NOT IN ('ready', 'cancelled')) THEN
    NEW.security_codes = NULL;
    RAISE NOTICE 'Codes de sécurité supprimés pour le SAV % (statut: %)', NEW.case_number, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger sur UPDATE du statut
DROP TRIGGER IF EXISTS trigger_clear_security_codes ON sav_cases;
CREATE TRIGGER trigger_clear_security_codes
BEFORE UPDATE OF status ON sav_cases
FOR EACH ROW
EXECUTE FUNCTION clear_security_codes_on_completion();