-- Ajouter les délais de traitement maximum dans la table shops
ALTER TABLE public.shops 
ADD COLUMN max_sav_processing_days_client INTEGER DEFAULT 7,
ADD COLUMN max_sav_processing_days_internal INTEGER DEFAULT 5;