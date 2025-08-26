-- Modifier les valeurs par défaut pour les délais de traitement SAV
ALTER TABLE public.shops 
ALTER COLUMN max_sav_processing_days_client SET DEFAULT 7,
ALTER COLUMN max_sav_processing_days_internal SET DEFAULT 7;

-- Mettre à jour les magasins existants qui ont les anciennes valeurs par défaut
UPDATE public.shops 
SET max_sav_processing_days_internal = 7 
WHERE max_sav_processing_days_internal = 5;

-- S'assurer que tous les magasins ont des valeurs définies
UPDATE public.shops 
SET 
  max_sav_processing_days_client = COALESCE(max_sav_processing_days_client, 7),
  max_sav_processing_days_internal = COALESCE(max_sav_processing_days_internal, 7)
WHERE max_sav_processing_days_client IS NULL OR max_sav_processing_days_internal IS NULL;