-- Ajouter le champ pour les délais de traitement des SAV externes
ALTER TABLE public.shops 
ADD COLUMN max_sav_processing_days_external integer DEFAULT 9;

-- Mettre à jour tous les magasins existants avec la valeur par défaut
UPDATE public.shops 
SET max_sav_processing_days_external = 9 
WHERE max_sav_processing_days_external IS NULL;