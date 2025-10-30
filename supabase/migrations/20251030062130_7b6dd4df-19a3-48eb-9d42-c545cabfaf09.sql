-- Ajouter les colonnes de traçabilité pour les modifications de détails SAV
ALTER TABLE public.sav_cases 
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS details_updated_at timestamp with time zone;

-- Créer un trigger pour mettre à jour automatiquement details_updated_at
CREATE OR REPLACE FUNCTION update_sav_case_details_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Détecter si les détails du dossier ont changé
  IF (OLD.device_brand IS DISTINCT FROM NEW.device_brand) OR
     (OLD.device_model IS DISTINCT FROM NEW.device_model) OR
     (OLD.device_imei IS DISTINCT FROM NEW.device_imei) OR
     (OLD.problem_description IS DISTINCT FROM NEW.problem_description) OR
     (OLD.repair_notes IS DISTINCT FROM NEW.repair_notes) OR
     (OLD.sku IS DISTINCT FROM NEW.sku) THEN
    NEW.details_updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_sav_case_details_timestamp
BEFORE UPDATE ON public.sav_cases
FOR EACH ROW
EXECUTE FUNCTION update_sav_case_details_timestamp();