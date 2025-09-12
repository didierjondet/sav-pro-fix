-- Ajouter les champs pour les notifications d'alerte SAV avant retard
ALTER TABLE public.shops 
ADD COLUMN sav_delay_alerts_enabled boolean DEFAULT false,
ADD COLUMN sav_client_alert_days integer DEFAULT 2,
ADD COLUMN sav_external_alert_days integer DEFAULT 2,
ADD COLUMN sav_internal_alert_days integer DEFAULT 2;