-- Étape finale: Nettoyer les colonnes obsolètes de la table shops
-- Maintenant que les délais sont gérés par les types SAV

ALTER TABLE public.shops 
DROP COLUMN IF EXISTS max_sav_processing_days_client,
DROP COLUMN IF EXISTS max_sav_processing_days_external, 
DROP COLUMN IF EXISTS max_sav_processing_days_internal;