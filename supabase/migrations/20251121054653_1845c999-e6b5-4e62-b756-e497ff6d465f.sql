-- Ajouter les colonnes pour la configuration de l'alerte SMS dans shops
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS sms_alert_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_alert_threshold INTEGER DEFAULT 20;

-- Commentaires pour la documentation
COMMENT ON COLUMN public.shops.sms_alert_enabled IS 'Activer/désactiver l''alerte SMS dans le header';
COMMENT ON COLUMN public.shops.sms_alert_threshold IS 'Seuil de crédits SMS restants pour afficher l''alerte (par défaut 20)';