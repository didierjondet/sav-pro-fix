-- Ajouter une colonne pour traquer la date de modification des prix
ALTER TABLE public.parts ADD COLUMN price_last_updated timestamp with time zone DEFAULT now();

-- Créer une fonction pour mettre à jour automatiquement cette date quand les prix changent
CREATE OR REPLACE FUNCTION public.update_part_price_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Vérifier si les prix ont changé
  IF (OLD.purchase_price IS DISTINCT FROM NEW.purchase_price) OR 
     (OLD.selling_price IS DISTINCT FROM NEW.selling_price) THEN
    NEW.price_last_updated = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Créer le trigger pour mettre à jour automatiquement la date
CREATE TRIGGER update_part_price_timestamp_trigger
  BEFORE UPDATE ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_part_price_timestamp();