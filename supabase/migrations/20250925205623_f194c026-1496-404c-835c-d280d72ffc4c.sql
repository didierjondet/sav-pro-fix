-- Migration pour centraliser la gestion des délais SAV dans les types SAV
-- Étape 1: Mettre à jour les types SAV existants avec les délais actuels des magasins

-- Mettre à jour les types 'client' avec max_sav_processing_days_client
UPDATE public.shop_sav_types 
SET max_processing_days = shops.max_sav_processing_days_client
FROM public.shops
WHERE shop_sav_types.shop_id = shops.id 
AND shop_sav_types.type_key = 'client'
AND shops.max_sav_processing_days_client IS NOT NULL
AND shop_sav_types.max_processing_days IS NULL;

-- Mettre à jour les types 'external' avec max_sav_processing_days_external
UPDATE public.shop_sav_types 
SET max_processing_days = shops.max_sav_processing_days_external  
FROM public.shops
WHERE shop_sav_types.shop_id = shops.id 
AND shop_sav_types.type_key = 'external'
AND shops.max_sav_processing_days_external IS NOT NULL
AND shop_sav_types.max_processing_days IS NULL;

-- Mettre à jour les types 'internal' avec max_sav_processing_days_internal
UPDATE public.shop_sav_types 
SET max_processing_days = shops.max_sav_processing_days_internal
FROM public.shops
WHERE shop_sav_types.shop_id = shops.id 
AND shop_sav_types.type_key = 'internal'
AND shops.max_sav_processing_days_internal IS NOT NULL  
AND shop_sav_types.max_processing_days IS NULL;

-- Définir des valeurs par défaut pour les types qui n'ont pas encore de délais
UPDATE public.shop_sav_types 
SET max_processing_days = 7
WHERE type_key = 'client' AND max_processing_days IS NULL;

UPDATE public.shop_sav_types 
SET max_processing_days = 9
WHERE type_key = 'external' AND max_processing_days IS NULL;

UPDATE public.shop_sav_types 
SET max_processing_days = 5
WHERE type_key = 'internal' AND max_processing_days IS NULL;