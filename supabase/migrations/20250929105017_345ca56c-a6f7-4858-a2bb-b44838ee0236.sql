-- Ajouter la colonne alert_days à shop_sav_types pour les délais d'alerte
ALTER TABLE public.shop_sav_types 
ADD COLUMN alert_days integer DEFAULT 2;

-- Migrer les données existantes des colonnes shops vers shop_sav_types
UPDATE public.shop_sav_types 
SET alert_days = (
  SELECT CASE 
    WHEN shop_sav_types.type_key = 'client' THEN shops.sav_client_alert_days
    WHEN shop_sav_types.type_key = 'external' THEN shops.sav_external_alert_days
    WHEN shop_sav_types.type_key = 'internal' THEN shops.sav_internal_alert_days
    ELSE 2
  END
  FROM public.shops 
  WHERE shops.id = shop_sav_types.shop_id
);

-- Supprimer les anciennes colonnes obsolètes de la table shops
ALTER TABLE public.shops 
DROP COLUMN IF EXISTS sav_client_alert_days,
DROP COLUMN IF EXISTS sav_external_alert_days,
DROP COLUMN IF EXISTS sav_internal_alert_days;